import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './Reports.css';

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await api.get('/api/relationships/patients');
      return response.json();
    },
  });

  const { data: patientScans } = useQuery({
    queryKey: ['patient-scans', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const response = await api.get(`/api/scans?patient_id=${selectedPatientId}&limit=100`);
      return response.json();
    },
    enabled: !!selectedPatientId,
  });

  const { data: patientTreatments } = useQuery({
    queryKey: ['patient-treatments', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const response = await api.get(`/api/treatments?patient_id=${selectedPatientId}`);
      return response.json();
    },
    enabled: !!selectedPatientId,
  });

  const prepareChartData = () => {
    if (!patientScans || patientScans.length === 0) return [];

    return patientScans.map((scan: any) => ({
      date: new Date(scan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      acne: scan.acne?.metrics?.totalCount || 0,
      pigmentation: parseFloat(scan.pigmentation?.metrics?.pigmentedPercent || '0'),
      wrinkles: scan.wrinkles?.metrics?.count || 0,
    }));
  };

  const exportReport = () => {
    if (!selectedPatientId || !patientScans) return;

    const patient = patients?.find((p: any) => p.id === selectedPatientId);
    const chartData = prepareChartData();

    const report = {
      patient: {
        name: patient?.full_name,
        email: patient?.email,
      },
      generatedDate: new Date().toISOString(),
      totalScans: patientScans.length,
      scans: patientScans.map((scan: any) => ({
        date: scan.timestamp,
        type: scan.analysisType,
        acne: scan.acne ? {
          severity: scan.acne.severity,
          totalCount: scan.acne.metrics?.totalCount,
        } : null,
        pigmentation: scan.pigmentation ? {
          severity: scan.pigmentation.severity,
          percentage: scan.pigmentation.metrics?.pigmentedPercent,
        } : null,
        wrinkles: scan.wrinkles ? {
          severity: scan.wrinkles.severity,
          count: scan.wrinkles.metrics?.count,
        } : null,
      })),
      treatments: patientTreatments || [],
      chartData,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-report-${patient?.full_name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const chartData = prepareChartData();

  return (
    <div className="reports-page">
      <header className="reports-header">
        <button onClick={() => navigate('/doctor')} className="back-button">
          ← Back
        </button>
        <h1>Patient Reports</h1>
      </header>

      <div className="reports-content">
        <div className="reports-controls">
          <div className="control-group">
            <label>Select Patient</label>
            <select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(e.target.value || null)}
              className="patient-select"
            >
              <option value="">-- Select Patient --</option>
              {patients?.map((patient: any) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name} ({patient.email})
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Report Type</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="summary"
                  checked={reportType === 'summary'}
                  onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
                />
                Summary
              </label>
              <label>
                <input
                  type="radio"
                  value="detailed"
                  checked={reportType === 'detailed'}
                  onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed')}
                />
                Detailed
              </label>
            </div>
          </div>

          {selectedPatientId && (
            <button onClick={exportReport} className="export-button">
              Export Report
            </button>
          )}
        </div>

        {selectedPatientId && patientScans && patientScans.length > 0 ? (
          <div className="reports-data">
            <div className="report-summary">
              <h2>Summary</h2>
              <div className="summary-grid">
                <div className="summary-card">
                  <h3>Total Scans</h3>
                  <p className="summary-value">{patientScans.length}</p>
                </div>
                <div className="summary-card">
                  <h3>Active Treatments</h3>
                  <p className="summary-value">
                    {patientTreatments?.filter((t: any) => t.status === 'active').length || 0}
                  </p>
                </div>
                <div className="summary-card">
                  <h3>Latest Scan</h3>
                  <p className="summary-value">
                    {new Date(patientScans[0]?.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="report-charts">
                <h2>Progress Over Time</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="acne" stroke="#00B894" name="Acne Lesions" />
                      <Line type="monotone" dataKey="pigmentation" stroke="#FFA726" name="Pigmentation %" />
                      <Line type="monotone" dataKey="wrinkles" stroke="#4A90E2" name="Wrinkles" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {reportType === 'detailed' && (
              <div className="report-details">
                <h2>Detailed Scan History</h2>
                <div className="scans-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Acne Severity</th>
                        <th>Pigmentation Severity</th>
                        <th>Wrinkles Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientScans.map((scan: any) => (
                        <tr key={scan._id || scan.id}>
                          <td>{new Date(scan.timestamp).toLocaleDateString()}</td>
                          <td>{scan.analysisType}</td>
                          <td>{scan.acne?.severity || 'N/A'}</td>
                          <td>{scan.pigmentation?.severity || 'N/A'}</td>
                          <td>{scan.wrinkles?.severity || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : selectedPatientId ? (
          <div className="empty-state">
            <p>No scan data available for this patient</p>
          </div>
        ) : (
          <div className="empty-state">
            <p>Please select a patient to generate a report</p>
          </div>
        )}
      </div>
    </div>
  );
}
