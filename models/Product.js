import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Door Machines",
        "Miter Machines",
        "Shape & Sand Machines",
        "Raised Panel Machines",
        "Cope/Tenon Machines",
        "Stile/Rail Machines",
        "Arch Machines",
        "Pocket Boring Machines",
        "Assembly Tables",
        "Line Boring Machines",
      ],
    },
    description: {
      type: String,
      required: true,
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    inStock: {
      type: Boolean,
      default: true,
    },
    flashSale: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Index for search functionality
productSchema.index({ name: "text", model: "text", description: "text" });

export const Product = mongoose.model("Product", productSchema);
