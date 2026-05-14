import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  article: { type: Number, required: true, unique: true },
  name: String,
  price_purchase: Number, 
  stock: Number,
  markup: { type: Number, default: 20 },
  price_final: Number,
  lastUpdated: { type: Date, default: Date.now }
});

export const Product = mongoose.model('product', ProductSchema);