import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPlans,
  getMySubscription,
  createOrder,
  verifyPayment
} from '../../api/subscriptionApi';
import { loadRazorpay } from '../../utils/loadRazorpay';
import { useAuth } from '../../context/AuthContext';

function PlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [busyPlan, setBusyPlan] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    getPlans()
      .then((res) => setPlans(res.data))
      .catch(() => setMessage({ type: 'error', text: 'Could not load plans' }));
    refreshSubscription();
  }, []);

  async function refreshSubscription() {
    try {
      const res = await getMySubscription();
      setSubscription(res.data);
    } catch (err) {
      // no subscription yet, that's fine
    }
  }

  const isActive = subscription && subscription.status === 'active';

  async function handleSubscribe(planId) {
    setMessage({ type: '', text: '' });
    setBusyPlan(planId);

    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        throw new Error('Could not load the payment window. Check your internet and try again.');
      }

      const { data: order } = await createOrder(planId);

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Sikhaba',
        description: `${planId === 'yearly' ? 'Yearly' : 'Monthly'} plan`,
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: { color: '#6c47ff' },
        modal: { ondismiss: () => setBusyPlan(null) },
        handler: async (response) => {
          try {
            await verifyPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            });
            setMessage({ type: 'success', text: 'Payment successful! Your subscription is active.' });
            await refreshSubscription();
          } catch (err) {
            setMessage({
              type: 'error',
              text:
                (err.response?.data?.message || 'Activation failed.') +
                ` Keep this payment id for support: ${response.razorpay_payment_id}`
            });
          } finally {
            setBusyPlan(null);
          }
        }
      });

      rzp.on('payment.failed', (resp) => {
        setMessage({
          type: 'error',
          text: resp.error?.description || 'Payment failed. Please try again.'
        });
        setBusyPlan(null);
      });

      rzp.open();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
      setBusyPlan(null);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '30px auto', padding: '0 16px' }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h2>💳 Sikhaba Plans</h2>

      {isActive ? (
        <p>
          ✅ Active: <strong>{subscription.plan}</strong> plan, valid until{' '}
          {new Date(subscription.end_date).toLocaleDateString()}
        </p>
      ) : (
        <p>You're on Guest Mode: 60 minutes of talk time per day. Subscribe for unlimited time.</p>
      )}

      {message.text && (
        <p style={{ color: message.type === 'error' ? 'red' : 'limegreen' }}>{message.text}</p>
      )}

      {plans.map((plan) => (
        <div
          key={plan.id}
          style={{ border: '1px solid #ccc', padding: 16, borderRadius: 6, marginBottom: 12 }}
        >
          <h3>{plan.label}</h3>
          <p style={{ fontSize: 24 }}>₹{plan.amount}</p>
          <p>{plan.description}</p>
          <button onClick={() => handleSubscribe(plan.id)} disabled={busyPlan !== null}>
            {busyPlan === plan.id ? 'Opening payment...' : isActive ? 'Extend' : 'Subscribe'}
          </button>
        </div>
      ))}
    </div>
  );
}

export default PlanPage;