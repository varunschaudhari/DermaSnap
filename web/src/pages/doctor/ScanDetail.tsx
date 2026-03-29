import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import './ScanDetail.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

export default function ScanDetail() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentForm, setTreatmentForm] = useState({
    product_name: '',
    frequency: 'Once Daily',
    duration_days: 30,
    notes: '',
    diagnosis: '',
  });

  const { data: scan, isLoading } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: async () => {
      const response = await api.get(`/api/scans/${scanId}`);
      return response.json();
    },
    enabled: !!scanId,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!scan) {
    return <div>Scan not found</div>;
  }

  const createTreatmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/treatments', {
        ...data,
        patient_id: scan.user_id || scan.profileId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
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
    <div className="scan-detail">
      <header className="detail-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1>Scan Details</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowDiagnosisModal(true)} className="action-button">
            Add Diagnosis
          </button>
          <button onClick={() => setShowTreatmentModal(true)} className="action-button">
            Add Treatment
          </button>
        </div>
      </header>

      <div className="scan-content">
        <div className="scan-image-section">
          <img
            src={`${BACKEND_URL}${scan.imageUri}`}
            alt="Scan"
            className="scan-image"
          />
        </div>

        <div className="scan-metrics">
          {scan.acne && (
            <div className="metric-card">
              <h2>Acne Analysis</h2>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Total Lesions:</span>
                  <span className="metric-value">{scan.acne.metrics?.totalCount || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Severity:</span>
                  <span className="metric-value">{scan.acne.severity}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Comedones:</span>
                  <span className="metric-value">{scan.acne.metrics?.comedones || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Papules:</span>
                  <span className="metric-value">{scan.acne.metrics?.papules || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Pustules:</span>
                  <span className="metric-value">{scan.acne.metrics?.pustules || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Nodules:</span>
                  <span className="metric-value">{scan.acne.metrics?.nodules || 0}</span>
                </div>
              </div>
            </div>
          )}

          {scan.pigmentation && (
            <div className="metric-card">
              <h2>Pigmentation Analysis</h2>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Pigmented Area:</span>
                  <span className="metric-value">{scan.pigmentation.metrics?.pigmentedPercent || '0%'}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Severity:</span>
                  <span className="metric-value">{scan.pigmentation.severity}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">SHI Index:</span>
                  <span className="metric-value">{scan.pigmentation.metrics?.shi || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {scan.wrinkles && (
            <div className="metric-card">
              <h2>Wrinkles Analysis</h2>
              <div className="metric-grid">
                <div className="metric-item">
                  <span className="metric-label">Wrinkle Count:</span>
                  <span className="metric-value">{scan.wrinkles.metrics?.count || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Severity:</span>
                  <span className="metric-value">{scan.wrinkles.severity}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Density:</span>
                  <span className="metric-value">{scan.wrinkles.metrics?.densityPercent || '0%'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="modal-overlay" onClick={() => setShowDiagnosisModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Diagnosis</h2>
            <div className="form-group">
              <label>Diagnosis</label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis..."
                rows={5}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={() => setShowDiagnosisModal(false)} className="cancel-button">
                Cancel
              </button>
              <button onClick={() => {
                setTreatmentForm({ ...treatmentForm, diagnosis });
                setShowDiagnosisModal(false);
                setShowTreatmentModal(true);
              }} className="save-button" disabled={!diagnosis}>
                Continue to Treatment
              </button>
            </div>
          </div>
        </div>
      )}

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
                value={treatmentForm.diagnosis || diagnosis}
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
