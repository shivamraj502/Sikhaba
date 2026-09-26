import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, updateProfile } from '../../api/authApi';
import { getMySubscription } from '../../api/subscriptionApi';
import { useAuth } from '../../context/AuthContext';

function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    loadSubscription();
  }, []);

  async function loadProfile() {
    try {
      const res = await getMyProfile();
      setProfile(res.data);
      setName(res.data.name);
      setCountryCode(res.data.country_code || '');
    } catch (err) {
      setError('Failed to load profile');
    }
  }

  async function loadSubscription() {
    try {
      const res = await getMySubscription();
      setSubscription(res.data);
    } catch (err) {
      // no subscription — fine, not an error state
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      const res = await updateProfile({ name, country_code: countryCode });
      setProfile(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!profile) return <div>Loading profile...</div>;

  const isActiveSubscriber = subscription && subscription.status === 'active';

  return (
    <div style={{ maxWidth: 500, margin: '30px auto', padding: '0 16px' }}>
      <h2>👤 Profile</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!editing ? (
        <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 6 }}>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email || 'Not set'}</p>
          <p><strong>Phone:</strong> {profile.phone || 'Not set'}</p>
          <p><strong>Country:</strong> {profile.country_code || 'Not set'}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ border: '1px solid #ccc', padding: 16, borderRadius: 6 }}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
          <br /><br />
          <label>Country code (e.g. IN, US)</label>
          <input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} maxLength={5} />
          <br /><br />
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditing(false)} style={{ marginLeft: 8 }}>Cancel</button>
        </form>
      )}

      <div style={{ marginTop: 20, border: '1px solid #ddd', padding: 16, borderRadius: 6 }}>
        <h4>💳 Subscription</h4>
        {isActiveSubscriber ? (
          <>
            <p>✅ Active — <strong>{subscription.plan}</strong> plan</p>
            <p>Expires: {new Date(subscription.end_date).toLocaleDateString()}</p>
          </>
        ) : (
          <>
            <p>You're on Guest Mode (60 min/day free)</p>
            <button onClick={() => navigate('/subscription')}>Upgrade Now</button>
          </>
        )}
      </div>

      <button onClick={handleLogout} style={{ marginTop: 20, color: 'red' }}>Logout</button>
    </div>
  );
}

export default UserProfile;