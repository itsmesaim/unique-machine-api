import { Product } from "../models/Product.js";
import { Inquiry } from "../models/Inquiry.js";
import AuditLog from "../models/AuditLog.js";
import { hasPermission } from "../middleware/auth.js";

// Helper to log actions from resolvers (no req object here, context has what we need)
async function log(context, action, target, diff = {}) {
  try {
    await AuditLog.create({
      actor: context.username || "unknown",
      actorRole: context.role || "unknown",
      action,
      target,
      diff,
    });
  } catch (e) {
    console.error("Audit log error:", e.message);
  }
}

export const resolvers = {
  Query: {
    // PUBLIC: Get all products
    products: async (_, { category, search }) => {
      const query = {};
      if (category) query.category = category;
      if (search) query.$text = { $search: search };
      return await Product.find(query).sort({ order: 1, createdAt: -1 });
    },

    // PUBLIC: Get single product
    product: async (_, { id }) => {
      return await Product.findById(id);
    },

    // PROTECTED: Get all inquiries
    inquiries: async (_, { status }, context) => {
      if (!hasPermission(context, "inquiries.view"))
        throw new Error("Unauthorized");

      const query = {};
      if (status) query.status = status;
      return await Inquiry.find(query).sort({ createdAt: -1 });
    },

    // PROTECTED: Get single inquiry
    inquiry: async (_, { id }, context) => {
      if (!hasPermission(context, "inquiries.view"))
        throw new Error("Unauthorized");

      return await Inquiry.findById(id);
    },
  },

  Mutation: {
    // PUBLIC: Create inquiry (contact form)
    createInquiry: async (_, { input }) => {
      const inquiry = new Inquiry(input);
      return await inquiry.save();
    },

    // PROTECTED: Add product
    addProduct: async (_, { input }, context) => {
      if (!hasPermission(context, "products.create"))
        throw new Error("Unauthorized");

      const specsMap = new Map();
      if (input.specs) {
        input.specs.forEach(({ key, value }) => specsMap.set(key, value));
      }

      const product = await new Product({ ...input, specs: specsMap }).save();

      await log(context, "product.create", `Product: ${product.name}`, {
        after: { name: product.name, category: product.category },
      });

      return product;
    },

    // PROTECTED: Update product
    updateProduct: async (_, { id, input }, context) => {
      if (!hasPermission(context, "products.update"))
        throw new Error("Unauthorized");

      if (input.specs) {
        const specsMap = new Map();
        input.specs.forEach(({ key, value }) => specsMap.set(key, value));
        input.specs = specsMap;
      }

      const before = await Product.findById(id);
      const product = await Product.findByIdAndUpdate(id, input, { new: true });

      await log(context, "product.update", `Product: ${product.name}`, {
        before: {
          name: before.name,
          price: before.price,
          flashSale: before.flashSale,
        },
        after: {
          name: product.name,
          price: product.price,
          flashSale: product.flashSale,
        },
      });

      return product;
    },

    // PROTECTED: Delete product
    deleteProduct: async (_, { id }, context) => {
      if (!hasPermission(context, "products.delete"))
        throw new Error("Unauthorized");

      const product = await Product.findById(id);
      await Product.findByIdAndDelete(id);

      await log(context, "product.delete", `Product: ${product?.name || id}`);

      return true;
    },

    // PROTECTED: Toggle flash sale
    toggleFlashSale: async (_, { id, flashSale }, context) => {
      if (!hasPermission(context, "flash_sale.toggle"))
        throw new Error("Unauthorized");

      const product = await Product.findByIdAndUpdate(
        id,
        { flashSale },
        { new: true },
      );

      await log(context, "product.flash_sale", `Product: ${product.name}`, {
        after: { flashSale },
      });

      return product;
    },

    // PROTECTED: Update inquiry status
    updateInquiryStatus: async (_, { id, status, replied }, context) => {
      if (!hasPermission(context, "inquiries.update"))
        throw new Error("Unauthorized");

      const update = { status };
      if (replied !== undefined) update.replied = replied;

      const inquiry = await Inquiry.findByIdAndUpdate(id, update, {
        new: true,
      });

      await log(
        context,
        "inquiry.update",
        `Inquiry: ${inquiry.name} — ${inquiry.email}`,
        {
          after: { status, replied },
        },
      );

      return inquiry;
    },

    // PROTECTED: Delete inquiry
    deleteInquiry: async (_, { id }, context) => {
      if (!hasPermission(context, "inquiries.view"))
        throw new Error("Unauthorized");

      const inquiry = await Inquiry.findById(id);
      await Inquiry.findByIdAndDelete(id);

      await log(context, "inquiry.delete", `Inquiry: ${inquiry?.name || id}`);

      return true;
    },
  },

  Product: {
    specs: (parent) => {
      if (!parent.specs) return [];
      return Array.from(parent.specs, ([key, value]) => ({ key, value }));
    },
  },
};
