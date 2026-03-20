export const typeDefs = `#graphql
  type Product {
    id: ID!
    name: String!
    model: String!
    category: String!
    description: String!
    specs: [SpecEntry!]!
    images: [String!]!
    inStock: Boolean!
    flashSale: Boolean!
    order: Int!
    createdAt: String!
    updatedAt: String!
  }

  type SpecEntry {
    key: String!
    value: String!
  }

  type Inquiry {
    id: ID!
    name: String!
    email: String!
    phone: String
    company: String
    message: String!
    productModel: String
    status: String!
    replied: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  input ProductInput {
    name: String!
    model: String!
    category: String!
    description: String!
    specs: [SpecInputEntry!]
    images: [String!]!
    inStock: Boolean
    flashSale: Boolean
    order: Int
  }

  input SpecInputEntry {
    key: String!
    value: String!
  }

  input ProductUpdateInput {
    name: String
    model: String
    category: String
    description: String
    specs: [SpecInputEntry!]
    images: [String!]
    inStock: Boolean
    flashSale: Boolean
    order: Int
  }

  input InquiryInput {
    name: String!
    email: String!
    phone: String
    company: String
    message: String!
    productModel: String
  }

  type Query {
    # Public queries (no auth required)
    products(category: String, search: String): [Product!]!
    product(id: ID!): Product
    
    # Protected queries (admin only)
    inquiries(status: String): [Inquiry!]!
    inquiry(id: ID!): Inquiry
  }

  type Mutation {
    # Public mutations
    createInquiry(input: InquiryInput!): Inquiry!
    
    # Protected mutations (admin only)
    addProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductUpdateInput!): Product!
    deleteProduct(id: ID!): Boolean!
    toggleFlashSale(id: ID!, flashSale: Boolean!): Product!
    
    updateInquiryStatus(id: ID!, status: String!, replied: Boolean): Inquiry!
    deleteInquiry(id: ID!): Boolean!
  }
`;