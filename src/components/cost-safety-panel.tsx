'use client';
import { Cloud, Download, ShieldCheck } from 'lucide-react';
import type { Workspace } from '@/domain/types';
import { COST_POLICY, formatBytes, jsonBytes } from '@/lib/cost-policy';
import { Button } from './ui/button';
export function CostSafetyPanel({
  workspace,
  onBackup,
}: {
  workspace: Workspace;
  onBackup: (format: 'json' | 'csv') => void;
}) {
  const bytes = jsonBytes(workspace);
  return (
    <section className="panel cost-safety-panel">
      <div className="panel-heading">
        <div>
          <h2>
            <ShieldCheck size={18} /> Proteção de custos e dados
          </h2>
          <p>Orçamento adicional autorizado: R$ 0,00</p>
        </div>
        <span className="badge paid">Somente Supabase</span>
      </div>
      <div className="cost-safety-body">
        <div className="notice">
          <Cloud size={20} />
          <span>
            Os registros financeiros ficam na sua conta. A mesma conta Google acessa os mesmos dados
            em todos os dispositivos. Nenhum banco financeiro é mantido neste navegador.
          </span>
        </div>
        <div className="cost-measures">
          <div>
            <small>Tamanho dos registros da conta carregados na memória</small>
            <strong>{formatBytes(bytes)}</strong>
            <span>Limite por gravação: {formatBytes(COST_POLICY.maxWorkspaceBytes)}</span>
          </div>
          <div>
            <small>Consumo e franquia da hospedagem</small>
            <strong>Não disponíveis</strong>
            <span>O tamanho dos registros não mede cobrança ou tráfego.</span>
          </div>
        </div>
        <progress
          aria-label="Uso do limite de segurança"
          value={bytes}
          max={COST_POLICY.maxWorkspaceBytes}
        />
        <p>
          Alterações são confirmadas somente após resposta do Supabase. Sem conexão, não há fila ou
          gravação local. Outros dispositivos atualizam a cada 30 segundos enquanto a tela está
          visível, e ao retomar o aplicativo.
        </p>
        <div className="cost-actions">
          <Button variant="outline" onClick={() => onBackup('json')}>
            <Download size={16} />
            Backup completo JSON
          </Button>
          <Button variant="outline" onClick={() => onBackup('csv')}>
            <Download size={16} />
            Backup completo CSV
          </Button>
        </div>
        <p className="muted">
          Backups são arquivos baixados apenas quando você solicitar. Guarde-os em um local privado.
          Os limites e o faturamento dos provedores devem ser acompanhados nas respectivas contas.
        </p>
        <a className="text-button" href="/custos-e-backup.html" target="_blank" rel="noreferrer">
          Ler relatório de custos e backup
        </a>
      </div>
    </section>
  );
}
