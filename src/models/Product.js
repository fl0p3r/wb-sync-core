import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  article: { type: Number, required: true, unique: true },
  name: String,
  price_purchase: Number, 
  stock: Number,
  // Новые поля
  markup: { type: Number, default: 20 }, // Наценка в % (по умолчанию 20)
  price_final: Number,                   // Цена для WB (Закуп + Наценка)
  lastUpdated: { type: Date, default: Date.now }
});

export const Product = mongoose.model('product', ProductSchema);