import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => (
  <div className="py-20 text-center">
    <h1 className="text-4xl font-extrabold text-slate-900">404</h1>
    <p className="mt-2 text-sm text-slate-600">The page you are looking for does not exist.</p>
    <Link
      to="/"
      className="mt-5 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
    >
      Back to Excursions
    </Link>
  </div>
);
