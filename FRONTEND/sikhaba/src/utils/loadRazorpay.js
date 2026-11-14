let loadingPromise = null;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadingPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loadingPromise;
}