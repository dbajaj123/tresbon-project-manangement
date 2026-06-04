import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import api from '../../api/axios';

export default function EmpTraining() {
  const [trainings, setTrainings] = useState([]);

  useEffect(() => {
    api.get('/training').then(r => setTrainings(r.data));
  }, []);

  const certCount = trainings.filter(t => t.certificateIssued).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap size={28} className="text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold">My Training Records</h1>
          <p className="text-sm text-gray-500">{trainings.length} training(s) • {certCount} certificate(s)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Subject', 'Date', 'Duration', 'Trainer', 'Certificate', 'Expiry'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trainings.map(t => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{t.subject}</td>
                <td className="px-4 py-3 text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-600">{t.duration || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{t.trainerName || '-'}</td>
                <td className="px-4 py-3">
                  {t.certificateIssued
                    ? <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Issued</span>
                    : <span className="text-xs text-gray-400">No</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.expiryDate ? (
                    <span className={new Date(t.expiryDate) < new Date() ? 'text-red-500' : ''}>
                      {new Date(t.expiryDate).toLocaleDateString()}
                      {new Date(t.expiryDate) < new Date() && ' (Expired)'}
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
            {trainings.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No training records yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
