import { Simulation } from '../models/simulation.js';
import { Patient } from '../models/patient.js';

/**
 * Agregados para o painel. Taxa de conversão MVP: % de simulações com pontos (botox) sobre o total.
 */
export async function getDashboardSummary(userId) {
  const totalSimulations = await Simulation.countDocuments({ userId });
  const totalPatients = await Patient.countDocuments({ userId });

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const proceduresThisMonth = await Simulation.countDocuments({
    userId,
    date: { $gte: startMonth },
  });

  const withPoints = await Simulation.countDocuments({
    userId,
    points: { $gt: 0 },
  });
  let conversionRate = 0;
  if (totalSimulations > 0) {
    conversionRate = Math.round((withPoints / totalSimulations) * 100);
  }

  const recent = await Simulation.find({ userId })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  const recentDtos = recent.map((doc) => ({
    id: String(doc._id),
    patientName: doc.patientName,
    procedure: doc.procedure,
    date: doc.date instanceof Date ? doc.date.toISOString() : new Date(doc.date).toISOString(),
    points: doc.points != null ? doc.points : undefined,
  }));

  return {
    totalSimulations,
    totalPatients,
    proceduresThisMonth,
    conversionRate,
    recentSimulations: recentDtos,
  };
}
