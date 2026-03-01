import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    softwareName: { type: String, required: true },
    category: { type: String, required: true },
    cost: { type: Number, required: true, min: 0 },
    billingCycle: { type: String, enum: ["Monthly", "Yearly"], required: true },
    startDate: { type: Date, required: true },
    renewalDate: { type: Date, required: true },
    paymentMethod: { type: String },
    status: { type: String, enum: ["Active", "Cancelled", "Expired"], default: "Active" },
    notes: { type: String }
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ renewalDate: 1 });
subscriptionSchema.index({ category: 1 });

export default mongoose.model("Subscription", subscriptionSchema);
