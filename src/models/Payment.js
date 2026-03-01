import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String },
    transactionId: { type: String, unique: true }
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1 });
paymentSchema.index({ subscriptionId: 1 });
paymentSchema.index({ paymentDate: 1 });

export default mongoose.model("Payment", paymentSchema);
