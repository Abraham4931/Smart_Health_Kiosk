import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import api from '../api/client';

const DEFAULT_CENTER = [8.54, 39.27];
const emptyForm = { name: '', latitude: '', longitude: '', address: '', phone: '', specializations: '', bookingFee: '', imageUrl: '' };

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/hospitals');
    setHospitals(data.hospitals);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleMapSelect(lat, lng) {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('address', form.address || '');
      fd.append('phone', form.phone || '');
      fd.append('latitude', String(form.latitude));
      fd.append('longitude', String(form.longitude));
      fd.append('bookingFee', String(form.bookingFee || ''));
      fd.append('specializations', form.specializations || '');
      if (photoFile) fd.append('photo', photoFile);
      if (editing) {
        await api.put(`/admin/hospitals/${editing}`, fd);
      } else {
        await api.post('/admin/hospitals', fd);
      }
      setForm(emptyForm);
      setPhotoFile(null);
      setEditing(null);
      setShowForm(false);
      await load();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to save hospital';
      setSubmitError(String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(h) {
    setForm({
      name: h.name,
      latitude: h.location?.coordinates?.[1] ?? '',
      longitude: h.location?.coordinates?.[0] ?? '',
      address: h.address ?? '',
      phone: h.phone ?? '',
      specializations: h.specializations?.join(', ') ?? '',
      bookingFee: h.bookingFee ?? '',
      imageUrl: h.imageUrl ?? '',
    });
    setPhotoFile(null);
    setEditing(h._id);
    setShowForm(true);
  }

  const hasLocation = form.latitude !== '' && form.longitude !== '' && !Number.isNaN(Number(form.latitude)) && !Number.isNaN(Number(form.longitude));
  const mapCenter = hasLocation ? [Number(form.latitude), Number(form.longitude)] : DEFAULT_CENTER;

  // Vanilla Leaflet map: create when form is shown, destroy when hidden
  useEffect(() => {
    if (!showForm || !mapRef.current) return;

    const center = hasLocation ? [Number(form.latitude), Number(form.longitude)] : DEFAULT_CENTER;
    const map = L.map(mapRef.current).setView(center, hasLocation ? 14 : 6);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on('click', (e) => {
      handleMapSelect(e.latlng.lat, e.latlng.lng);
    });

    if (hasLocation) {
      markerRef.current = L.marker(center).addTo(map);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [showForm]);

  // Update marker and map view when selected location changes
  useEffect(() => {
    if (!showForm || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (hasLocation) {
      const pos = [Number(form.latitude), Number(form.longitude)];
      markerRef.current = L.marker(pos).addTo(map);
      map.setView(pos, 14);
    }
  }, [showForm, form.latitude, form.longitude, hasLocation]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Hospitals</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm); setPhotoFile(null); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ Add Hospital'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Hospital Name" required className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input name="bookingFee" value={form.bookingFee} onChange={handleChange} placeholder="Booking Fee (ETB)" type="number" className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input name="specializations" value={form.specializations} onChange={handleChange} placeholder="Specializations (comma-separated)" className="md:col-span-2 border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital photo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />
            {form.imageUrl && !photoFile && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Current photo:</p>
                <img src={form.imageUrl} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
              </div>
            )}
            {photoFile && <p className="text-xs text-green-600 mt-1">New photo selected</p>}
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-gray-600 mb-2">Location: click on the map to set latitude and longitude</p>
            <div
              ref={mapRef}
              className="rounded-lg border border-gray-200 w-full"
              style={{ height: 300, minHeight: 300 }}
            />
            {hasLocation && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
              </p>
            )}
          </div>

          {submitError && (
            <p className="md:col-span-2 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{submitError}</p>
          )}
          <button type="submit" disabled={!hasLocation || submitting} className="md:col-span-2 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Saving...' : (editing ? 'Update' : 'Create') + ' Hospital'}
          </button>
          {!hasLocation && <p className="md:col-span-2 text-sm text-amber-600">Click the map above to set the hospital location.</p>}
        </form>
      )}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500 w-20">Photo</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Address</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Specializations</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Fee</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {hospitals.map((h) => (
              <tr key={h._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {h.imageUrl ? (
                    <img src={h.imageUrl} alt="" className="h-12 w-12 object-cover rounded border border-gray-200" />
                  ) : (
                    <div className="h-12 w-12 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No photo</div>
                  )}
                </td>
                <td className="px-6 py-4 font-medium">{h.name}</td>
                <td className="px-6 py-4 text-gray-500">{h.address}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {h.specializations.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{s}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">{h.bookingFee} ETB</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {h.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => startEdit(h)} className="text-indigo-600 hover:underline text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
