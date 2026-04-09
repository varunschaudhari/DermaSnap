import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import './PatientDetail.css';

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [treatmentForm, setTreatmentForm] = useState({
    product_name: '',
    frequency: 'Once Daily',
    duration_days: 30,
    notes: '',
    diagnosis: '',
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/admin/users/${patientId}`);
      return response.json();
    },
    enabled: !!patientId,
  });

  const { data: scans } = useQuery({
    queryKey: ['scans', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/scans?patient_id=${patientId}`);
      return response.json();
    },
    enabled: !!patientId,
  });

  const { data: treatments } = useQuery({
    queryKey: ['treatments', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/treatments?patient_id=${patientId}`);
      return response.json();
    },
    enabled: !!patientId,
  });

  const createTreatmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/treatments', {
        ...data,
        patient_id: patientId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments', patientId] });
      setShowTreatmentModal(false);
      setTreatmentForm({
        product_name: '',
        frequency: 'Once Daily',
        duration_days: 30,
        notes: '',
        diagnosis: '',
      });
    },
  });

  const handleCreateTreatment = () => {
    createTreatmentMutation.mutate(treatmentForm);
  };

  return (
    <div className="patient-detail">
      <header className="detail-header">
        <button onClick={() => navigate('/doctor')} className="back-button">
          ← Back
        </button>
        <h1>{patient?.full_name || 'Patient'}</h1>
      </header>

      <div className="detail-content">
        <div className="info-section">
          <h2>Patient Information</h2>
          <div className="info-card">
            <p><strong>Email:</strong> {patient?.email}</p>
            <p><strong>Role:</strong> {patient?.role}</p>
          </div>
        </div>

        <div className="scans-section">
          <h2>Scan History</h2>
          {scans && scans.length > 0 ? (
            <div className="scans-list">
              {scans.map((scan: any) => (
                <div
                  key={scan._id || scan.id}
                  className="scan-card"
                  onClick={() => navigate(`/doctor/scan/${scan._id || scan.id}`)}
                >
                  <div>
                    <p><strong>Type:</strong> {scan.analysisType}</p>
                    <p><strong>Date:</strong> {new Date(scan.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="arrow">→</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No scans found</div>
          )}
        </div>

        <div className="treatments-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Treatment Plans</h2>
            <button onClick={() => setShowTreatmentModal(true)} className="add-button">
              + Add Treatment Plan
            </button>
          </div>
          {treatments && treatments.length > 0 ? (
            <div className="treatments-list">
              {treatments.map((treatment: any) => (
                <div key={treatment.id} className="treatment-card">
                  <h3>{treatment.product_name}</h3>
                  <p><strong>Frequency:</strong> {treatment.frequency}</p>
                  <p><strong>Duration:</strong> {treatment.duration_days} days</p>
                  <p><strong>Status:</strong> {treatment.status}</p>
                  {treatment.diagnosis && <p><strong>Diagnosis:</strong> {treatment.diagnosis}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No treatments found</div>
          )}
        </div>
      </div>

      {/* Add Treatment Modal */}
      {showTreatmentModal && (
        <div className="modal-overlay" onClick={() => setShowTreatmentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Treatment Plan</h2>
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                value={treatmentForm.product_name}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, product_name: e.target.value })}
                placeholder="e.g., Retin-A Cream"
              />
            </div>
            <div className="form-group">
              <label>Frequency</label>
              <select
                value={treatmentForm.frequency}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, frequency: e.target.value })}
              >
                <option>Once Daily</option>
                <option>Twice Daily</option>
                <option>As Needed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input
                type="number"
                value={treatmentForm.duration_days}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, duration_days: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="form-group">
              <label>Diagnosis</label>
              <textarea
                value={treatmentForm.diagnosis}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, diagnosis: e.target.value })}
                placeholder="Enter diagnosis..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={treatmentForm.notes}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowTreatmentModal(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={handleCreateTreatment} className="save-button" disabled={!treatmentForm.product_name}>
                Create Treatment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
