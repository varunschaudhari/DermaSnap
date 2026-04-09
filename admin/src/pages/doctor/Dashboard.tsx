import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import './Dashboard.css';

export default function DoctorDashboard() {
  const navigate = useNavigate();

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await api.get('/api/relationships/patients');
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/stats');
      return response.json();
    },
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Doctor Dashboard</h1>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Patients</h3>
            <p className="stat-value">{patients?.length || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Scans</h3>
            <p className="stat-value">{stats?.scans?.total || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Active Treatments</h3>
            <p className="stat-value">{stats?.treatments?.total || 0}</p>
          </div>
        </div>

        <div className="patients-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>My Patients</h2>
            <button onClick={() => navigate('/doctor/reports')} className="reports-button">
              Generate Reports
            </button>
          </div>
          {patientsLoading ? (
            <div>Loading...</div>
          ) : patients && patients.length > 0 ? (
            <div className="patients-list">
              {patients.map((patient: any) => (
                <div
                  key={patient.id}
                  className="patient-card"
                  onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                >
                  <div className="patient-info">
                    <h3>{patient.full_name}</h3>
                    <p>{patient.email}</p>
                  </div>
                  <span className="arrow">→</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No patients connected yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
