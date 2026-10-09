import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['internship','full-time'], required: true },
  pay: { type: String, required: true },
  topCandidates: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Job', jobSchema);
