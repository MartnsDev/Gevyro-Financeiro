// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LoginScreen } from '../src/components/login-screen';
afterEach(cleanup);
it('apresenta a marca e os benefícios com Google funcional, sem campos de senha fictícios', () => {
  const google = vi.fn().mockResolvedValue(undefined);
  render(
    <LoginScreen
      loading={false}
      busy={false}
      available
      error=""
      onGoogle={google}
      onReload={() => {}}
      onRecover={async () => {}}
    />,
  );
  expect(screen.getByRole('heading', { name: /Controle suas/ })).toBeTruthy();
  expect(screen.getByText('Metas e planejamento')).toBeTruthy();
  expect(screen.queryByLabelText('Senha')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Entrar com Google' }));
  expect(google).toHaveBeenCalledOnce();
});
it('informa carregamento e erro, preservando a recuperação de dados antigos', () => {
  const recover = vi.fn().mockResolvedValue(undefined);
  render(
    <LoginScreen
      loading={false}
      busy={false}
      available
      error="Falha temporária"
      onGoogle={async () => {}}
      onReload={() => {}}
      onRecover={recover}
    />,
  );
  expect(screen.getByRole('alert').textContent).toContain('Falha temporária');
  fireEvent.click(screen.getByText('Usava uma versão anterior neste navegador?'));
  fireEvent.click(screen.getByRole('button', { name: 'Recuperar backup anterior' }));
  expect(recover).toHaveBeenCalledOnce();
});
