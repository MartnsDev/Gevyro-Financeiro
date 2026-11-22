'use client';
import { useState } from 'react';
import { Download, HardDrive, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { Workspace } from '@/domain/types';
import { COST_POLICY, formatBytes, jsonBytes } from '@/lib/cost-policy';
import { Button } from './ui/button';
import { sharedSupabaseState } from '@/lib/shared-supabase';
interface LocalStorageInfo {
  usage?: number;
  quota?: number;
  persisted?: boolean;
}
export function CostSafetyPanel({
  workspace,
  onBackup,
}: {
  workspace: Workspace;
  onBackup: (format: 'json' | 'csv') => void;
}) {
  const [local, setLocal] = useState<LocalStorageInfo>();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  async function check(persist = false) {
    setChecking(true);
    try {
      if (!navigator.storage?.estimate) {
        setMessage(
          'Este navegador não disponibiliza as informações de armazenamento. Faça um backup manual.',
        );
        return;
      }
      const persisted =
        persist && navigator.storage.persist
          ? await navigator.storage.persist()
          : await navigator.storage.persisted?.();
      const estimated = await navigator.storage.estimate();
      setLocal({ ...estimated, persisted });
      setMessage(
        persist
          ? persisted
            ? 'O navegador concedeu armazenamento persistente. Isso não substitui o backup.'
            : 'O navegador não concedeu persistência. Seus dados continuam preservados; exporte backups regularmente.'
          : 'Informações locais atualizadas. Nenhuma consulta foi feita à hospedagem.',
      );
    } catch {
      setMessage(
        'Não foi possível consultar o armazenamento local. Seus dados não foram alterados.',
      );
    } finally {
      setChecking(false);
    }
  }
  const bytes = jsonBytes(workspace);
  const connection = sharedSupabaseState();
  return (
    <section className="panel cost-safety-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <ShieldCheck size={18} /> Proteção de custos e dados
          </h2>
          <p>Orçamento adicional autorizado: R$ 0,00</p>
        </div>
        <span className="badge paid">
          {connection === 'ready'
            ? 'Supabase MCell autorizado'
            : connection === 'pending'
              ? 'Supabase MCell · ativação pendente'
              : 'Serviços externos bloqueados'}
        </span>
      </div>
      <div className="cost-safety-body">
        <div className="notice">
          <LockKeyhole size={18} />
          <span>
            {connection === 'ready'
              ? 'Somente o Supabase do MCell está autorizado para dados e autenticação. O projeto compartilha os limites com a loja; não há contratação nem alteração de plano.'
              : connection === 'pending'
                ? 'A integração com o Supabase do MCell está preparada, mas permanece bloqueada até validar o plano e a migração exclusiva do Gevyro. Os dados locais estão preservados.'
                : 'Este aplicativo usa armazenamento local. Não contrata serviços nem compra créditos. O bloqueio de cobranças da plataforma depende das configurações da sua conta e não pôde ser verificado aqui.'}
          </span>
        </div>
        <div className="cost-measures">
          <div>
            <small>Tamanho dos registros carregados no aplicativo</small>
            <strong>{formatBytes(bytes)}</strong>
            <span>Limite de segurança do app: {formatBytes(COST_POLICY.maxWorkspaceBytes)}</span>
          </div>
          <div>
            <small>Consumo e franquia da hospedagem</small>
            <strong>Não disponíveis</strong>
            <span>Sem acesso às métricas oficiais da sua conta</span>
          </div>
        </div>
        <progress
          aria-label="Uso do limite de segurança local"
          value={bytes}
          max={COST_POLICY.maxWorkspaceBytes}
        />
        <p className="muted">
          O tamanho acima é local e não mede tráfego, créditos ou cobrança. Ao atingir o limite do
          app, novas gravações param com erro; o histórico não é apagado.
        </p>
        <div className="cost-actions">
          <Button variant="outline" onClick={() => onBackup('json')}>
            <Download size={16} /> Backup completo JSON
          </Button>
          <Button variant="outline" onClick={() => onBackup('csv')}>
            <Download size={16} /> Backup completo CSV
          </Button>
        </div>
        <div className="cost-actions">
          <Button variant="ghost" disabled={checking} onClick={() => void check()}>
            <HardDrive size={16} /> Verificar armazenamento local
          </Button>
          <Button variant="ghost" disabled={checking} onClick={() => void check(true)}>
            Solicitar persistência no navegador
          </Button>
        </div>
        {local && (
          <dl className="storage-details">
            <div>
              <dt>Uso estimado da origem inteira</dt>
              <dd>{local.usage === undefined ? 'Não informado' : formatBytes(local.usage)}</dd>
            </div>
            <div>
              <dt>Cota informada pelo navegador</dt>
              <dd>{local.quota === undefined ? 'Não informada' : formatBytes(local.quota)}</dd>
            </div>
            <div>
              <dt>Proteção contra remoção automática</dt>
              <dd>{local.persisted ? 'Concedida pelo navegador' : 'Não concedida'}</dd>
            </div>
          </dl>
        )}
        {message && (
          <p role="status" className="muted">
            {message}
          </p>
        )}
        <p className="muted">
          Limpar os dados do navegador ou trocar de dispositivo pode remover o acesso aos registros
          locais. Guarde os backups em um local privado. Indisponibilidade da hospedagem também pode
          impedir abrir o app; não existe garantia de retenção indefinida.
        </p>
        <a className="text-button" href="/custos-e-backup.html" target="_blank" rel="noreferrer">
          Ler relatório de custos e plano gratuito
        </a>
      </div>
    </section>
  );
}
