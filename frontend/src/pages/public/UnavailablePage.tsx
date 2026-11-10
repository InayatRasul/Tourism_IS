import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ServerCrash } from 'lucide-react';
import { healthApi } from '../../api/auth';
import { triggerServiceUnavailable } from '../../api/client';

export const UnavailablePage: React.FC = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  const handleRetry = async () => {
    setChecking(true);
    setErrText(null);
    try {
      await healthApi();
      triggerServiceUnavailable(false);
      navigate('/');
    } catch {
      setErrText('Database connection is still unavailable (HTTP 503 within < 3s timeout).');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <ServerCrash className="h-8 w-8" />
        </div>
        <span className="mt-4 inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
          HTTP 503 · SERVICE_UNAVAILABLE (NFR-02)
        </span>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Service Temporarily Unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tourism IS could not reach the database within the 3-second availability window (Lab04
          NFR-02). Your seat reservations and payments remain safe.
        </p>

        {errText && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
            {errText}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={handleRetry}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking DB…' : 'Retry Connection'}
          </button>
          <button
            onClick={() => {
              triggerServiceUnavailable(false);
              navigate('/');
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Return to UI
          </button>
        </div>
      </div>
    </div>
  );
};
