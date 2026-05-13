"use client";
import { FileDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as XLSX from 'xlsx';
import AddIcon from '@mui/icons-material/Add';
import { Button as MuiButton } from '@mui/material';
import { Button } from "@/components/ui/button";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

import { columns, LeadCloumn } from "./column";
import { DataTable, DataTableRef } from "@/components/ui/data-table";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// ── WhatsApp dropdown ────────────────────────────────────────────────────────
function WhatsAppMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '9px 16px',
          backgroundColor: '#25D366',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        💬 WhatsApp
        <span style={{ fontSize: '10px' }}>▾</span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
            }}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            zIndex: 50,
            minWidth: '220px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <p style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                WhatsApp
              </p>
            </div>
            {[
              {
                label: '📢 Schedule Campaign',
                desc: 'Select patients and schedule',
                action: () => {
                  setOpen(false)
                  router.push('/admin/campaigns')
                }
              },
              {
                label: '📋 View Templates',
                desc: 'Manage Hindi & English templates',
                action: () => {
                  setOpen(false)
                  router.push('/admin/wa-templates')
                }
              },
              {
                label: '📊 Campaign History',
                desc: 'See sent and scheduled campaigns',
                action: () => {
                  setOpen(false)
                  router.push('/admin/campaigns')
                }
              },
              {
                label: '⚙️ WA Settings',
                desc: 'Connection status and test',
                action: () => {
                  setOpen(false)
                  router.push('/admin/whatsapp')
                }
              },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 14px',
                  border: 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  borderBottom: i < 3
                    ? '1px solid #f1f5f9'
                    : 'none',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement)
                    .style.backgroundColor = '#f8fafc'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement)
                    .style.backgroundColor = 'white'
                }}
              >
                <p style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}>
                  {item.label}
                </p>
                <p style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                }}>
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface BillboardClientProps {
  data: LeadCloumn[];
}

export const BillboardClient: React.FC<BillboardClientProps> = ({
  data
}) => {
  const params = useParams();
  const router = useRouter();
  const tableRef = useRef<DataTableRef<LeadCloumn>>(null);
  const { onOpen } = useModal();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    templateId: '',
    language: 'hi' as 'hi' | 'en',
    city: '',
    date: '',
    time: '09:00',
  });
  const [schedulingCampaign, setSchedulingCampaign] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [startedCampaign, setStartedCampaign] = useState<{ campaignId: string; count: number } | null>(null);
  const [liveTemplates, setLiveTemplates] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openScheduleModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const selectedData = tableRef.current?.getSelectedData() || [];
    const firstCity = selectedData[0]?.city || '';
    setCampaignForm({
      name: `Campaign - ${firstCity || 'Patients'} - ${today}`,
      templateId: '',
      language: 'hi',
      city: firstCity,
      date: today,
      time: '09:00',
    });
    // Fetch DB templates
    fetch('/api/wa-templates')
      .then(r => r.json())
      .then(d => setWaTemplates(Array.isArray(d) ? d.filter((t: any) => t.isActive && t.metaStatus === 'APPROVED') : []))
      .catch(() => {});
    // Fetch live approved templates from Meta
    fetch('/api/whatsapp/templates')
      .then(r => r.json())
      .then(d => setLiveTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
    setStartedCampaign(null);
    setShowScheduleModal(true);
  };

  const scheduleCampaign = async () => {
    const selectedData = tableRef.current?.getSelectedData() || [];
    if (!campaignForm.templateId) {
      alert('Please select a template');
      return;
    }
    if (!campaignForm.date) {
      alert('Please select a date');
      return;
    }
    setSchedulingCampaign(true);
    try {
      // Convert IST to UTC (IST = UTC + 5:30)
      const istDateTime = new Date(`${campaignForm.date}T${campaignForm.time}:00`);
      const utcDateTime = new Date(istDateTime.getTime() - (5.5 * 60 * 60 * 1000));
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignForm.name,
          templateId: campaignForm.templateId,
          language: campaignForm.language,
          city: campaignForm.city,
          patientIds: selectedData.map(p => p.id),
          scheduledAt: utcDateTime.toISOString(),
        }),
      });
      if (res.ok) {
        alert(`Campaign scheduled for ${selectedData.length} patients on ${campaignForm.date} at ${campaignForm.time} IST`);
        setShowScheduleModal(false);
      } else {
        alert('Failed to schedule campaign');
      }
    } catch {
      alert('Failed to schedule campaign');
    } finally {
      setSchedulingCampaign(false);
    }
  };

  const sendNow = async () => {
    const selectedData = tableRef.current?.getSelectedData() || [];
    if (!campaignForm.templateId) {
      alert('Please select a template');
      return;
    }
    if (selectedData.length === 0) {
      alert('No patients selected');
      return;
    }

    const confirmed = confirm(`Send WhatsApp message to ${selectedData.length} patients right now?`);
    if (!confirmed) return;

    setSendingNow(true);
    setStartedCampaign(null);

    try {
      const res = await fetch('/api/campaigns/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignForm.name,
          templateId: campaignForm.templateId,
          language: campaignForm.language,
          city: campaignForm.city,
          patientIds: selectedData.map(p => p.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start campaign');
        return;
      }
      setStartedCampaign({ campaignId: data.campaignId, count: data.patientCount });
    } catch {
      alert('Failed to start campaign');
    } finally {
      setSendingNow(false);
    }
  };

  const selectedTemplate = waTemplates.find(t => t.id === campaignForm.templateId);

  // Selection count is kept in sync via the DataTable's onSelectionChange
  // prop (wired below), so no useEffect is needed here. A previous version
  // had an effect that depended on `tableRef.current?.getSelectedData()` —
  // a function call result, not a stable reference — which never triggered
  // a re-run anyway. Removed because it was dead + linter-flagged.

  const prepareExportData = (exportType: 'all' | 'current' | 'selected' | 'filtered') => {
    let exportData: LeadCloumn[] = [];
    
    switch (exportType) {
      case 'all':
        exportData = data;
        break;
      case 'current':
        exportData = tableRef.current?.getCurrentPageData() || [];
        break;
      case 'selected':
        exportData = tableRef.current?.getSelectedData() || [];
        break;
      case 'filtered':
        exportData = tableRef.current?.getFilteredData() || [];
        break;
    }

    // Remove the actions column and id from the export data
    return exportData.map(item => {
      const { id, ...rest } = item;
      return rest;
    });
  };

  const handleExport = (format: 'csv' | 'xlsx', exportType: 'all' | 'current' | 'selected' | 'filtered') => {
    const exportData = prepareExportData(exportType);
    
    if (exportData.length === 0) {
      alert('No data to export!');
      return;
    }

    const fileName = `patients-${exportType}-data.${format}`;

    if (format === 'csv') {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      downloadFile(csv, fileName, 'text/csv');
    } else {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');
      XLSX.writeFile(wb, fileName);
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Don't render anything until mounted
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Leads (${data.length})`} description="Manage patients for your hospital" />
        <div className="flex items-center gap-4">
          <WhatsAppMenu />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={selectedCount === 0}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Export All Records</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExport('csv', 'all')}>
                      as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx', 'all')}>
                      as Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Export Filtered Records</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExport('csv', 'filtered')}>
                      as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx', 'filtered')}>
                      as Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Export Current Page</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExport('csv', 'current')}>
                      as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx', 'current')}>
                      as Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Export Selected</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExport('csv', 'selected')}>
                      as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx', 'selected')}>
                      as Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <MuiButton
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => router.push(`/admin/addpatient`)}
          >
            Add New
          </MuiButton>
        </div>
      </div>
      <Separator />
      <DataTable
        ref={tableRef}
        columns={columns}
        data={data}
        onSelectionChange={(count: number) => setSelectedCount(count)}
        enableFiltering={true}
        searchableColumns={[
          'name',
          'phone',
          'city',
          'surgery',
          'implant',
          'patientStatus',
          'hospital'
        ]}
        filterableColumns={[
          {
            id: 'patientStatus',
            title: 'Patient Status'
          },
          {
            id: 'city',
            title: 'City'
          },
          {
            id: 'surgery',
            title: 'Surgery'
          },
          {
            id: 'implant',
            title: 'Implant'
          },
          {
            id: 'hospital',
            title: 'Hospital'
          }
        ]}
      />

      {/* Sticky selection action bar */}
      {selectedCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#0f172a',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          borderTop: '2px solid #2563eb',
        }}>
          <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
            {selectedCount} patients selected
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                // Deselect by reloading — DataTableRef has no clearSelection
                window.location.reload()
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '7px',
                border: '1px solid rgba(255,255,255,0.2)',
                backgroundColor: 'transparent',
                color: 'white',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Clear selection
            </button>
            <button
              onClick={openScheduleModal}
              style={{
                padding: '8px 20px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#25D366',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📅 Schedule Campaign
            </button>
            <button
              onClick={openScheduleModal}
              data-mode="send-now"
              style={{
                padding: '8px 20px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📤 Send Now
            </button>
          </div>
        </div>
      )}

      {/* Schedule Campaign Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '14px',
            padding: '28px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                Schedule WhatsApp Campaign
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
              >
                ×
              </button>
            </div>

            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#15803d',
            }}>
              📋 Sending to {selectedCount} selected patients
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  Campaign Name
                </label>
                <input
                  value={campaignForm.name}
                  onChange={e => setCampaignForm(f => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px',
                    border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  City (for context)
                </label>
                <input
                  value={campaignForm.city}
                  onChange={e => setCampaignForm(f => ({ ...f, city: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px',
                    border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box',
                  }}
                  placeholder="e.g. Bikaner"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  Template *
                </label>
                <select
                  value={campaignForm.templateId}
                  onChange={e => setCampaignForm(f => ({ ...f, templateId: e.target.value }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: '7px',
                    border: '1px solid #e2e8f0', fontSize: '14px',
                  }}
                >
                  <option value="">Select a template...</option>
                  {waTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.nameHi ? ` / ${t.nameHi}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                  Language
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['hi', 'en'] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setCampaignForm(f => ({ ...f, language: lang }))}
                      style={{
                        padding: '7px 18px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: campaignForm.language === lang ? '#2563eb' : 'white',
                        color: campaignForm.language === lang ? 'white' : '#374151',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {lang === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Preview
                  </p>
                  <div style={{
                    backgroundColor: '#dcf8c6',
                    borderRadius: '8px 8px 2px 8px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    color: '#1a1a1a',
                    maxHeight: '120px',
                    overflowY: 'auto',
                  }}>
                    {campaignForm.language === 'hi'
                      ? selectedTemplate.bodyHi?.replace('{{1}}', 'Patient Name')?.replace('{{2}}', campaignForm.city || 'City')
                      : selectedTemplate.bodyEn?.replace('{{1}}', 'Patient Name')?.replace('{{2}}', campaignForm.city || 'City')
                    }
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                    Date (IST) *
                  </label>
                  <input
                    type="date"
                    value={campaignForm.date}
                    onChange={e => setCampaignForm(f => ({ ...f, date: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '7px',
                      border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '5px' }}>
                    Time (IST) *
                  </label>
                  <input
                    type="time"
                    value={campaignForm.time}
                    onChange={e => setCampaignForm(f => ({ ...f, time: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: '7px',
                      border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Live Templates from Meta */}
            {liveTemplates.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: '#16a34a', marginBottom: '6px' }}>
                  Approved on Meta ({liveTemplates.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {liveTemplates.map((t: any) => (
                    <span key={t.name} style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '99px',
                      backgroundColor: campaignForm.templateId === t.name ? '#16a34a' : 'white',
                      color: campaignForm.templateId === t.name ? 'white' : '#374151',
                      border: '1px solid #d1d5db', cursor: 'pointer',
                    }}
                    onClick={() => setCampaignForm(f => ({ ...f, templateId: t.name }))}
                    >
                      {t.name} ({t.language})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {startedCampaign && (
              <div style={{
                marginTop: '12px', padding: '12px', borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
              }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#166534', marginBottom: '4px' }}>
                  ✓ Campaign started — {startedCampaign.count} patients processing in background
                </p>
                <p style={{ fontSize: '12px', color: '#374151' }}>
                  You can safely close this page.{' '}
                  <a
                    href={`/admin/campaigns/${startedCampaign.campaignId}`}
                    style={{ color: '#2563eb', textDecoration: 'underline' }}
                  >
                    View progress →
                  </a>
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={sendNow}
                disabled={sendingNow || schedulingCampaign}
                style={{
                  flex: 1,
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (sendingNow || schedulingCampaign) ? 'not-allowed' : 'pointer',
                  opacity: (sendingNow || schedulingCampaign) ? 0.7 : 1,
                }}
              >
                {sendingNow ? 'Sending...' : `Send Now to ${selectedCount}`}
              </button>
              <button
                onClick={scheduleCampaign}
                disabled={schedulingCampaign || sendingNow}
                style={{
                  flex: 1,
                  backgroundColor: '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (schedulingCampaign || sendingNow) ? 'not-allowed' : 'pointer',
                  opacity: (schedulingCampaign || sendingNow) ? 0.7 : 1,
                }}
              >
                {schedulingCampaign ? 'Scheduling...' : `Schedule for later`}
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};