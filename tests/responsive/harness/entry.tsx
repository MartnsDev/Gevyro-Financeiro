import React from 'react';
import { createRoot } from 'react-dom/client';
import FinanceApp from '../../../src/components/finance-app';
import '../../../src/app/globals.css';
import '../../../src/app/responsive.css';
import '../../../src/app/login.css';
createRoot(document.getElementById('root')!).render(<FinanceApp />);
