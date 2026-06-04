import { useEffect, useState } from 'react';
import { Building2, CheckCircle, XCircle } from 'lucide-react';
import { StatCard } from '../../components/ui/index';
import api from '../../api/axios';

export default function SADashboard() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    api.get('/companies').then(r => setCompanies(r.data));
  }, []);

  const active = companies.filter(c => c.status === 'active').length;
  const inactive = companies.filter(c => c.status === 'inactive').length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Superadmin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Companies" value={companies.length} icon={Building2} color="blue" />
        <StatCard title="Active" value={active} icon={CheckCircle} color="green" />
        <StatCard title="Inactive" value={inactive} icon={XCircle} color="yellow" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold">Recent Companies</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Company', 'Email', 'Employees', 'Status', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {companies.slice(0, 10).map(c => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-gray-600">{c.employeeCount}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
