'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  UserCheck,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  ExternalLink,
  AlertTriangle,
  Share2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AgentCode {
  id: string;
  code: string;
  label: string | null;
  isActive: boolean;
  activatedAt: string | null;
  lastUsedAt: string | null;
  checkInCount: number;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  slug: string;
}

export default function AgentCodesPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  const slug = params.slug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [agentCodes, setAgentCodes] = useState<AgentCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; code: AgentCode | null }>({
    open: false,
    code: null,
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const agentPortalUrl = typeof window !== 'undefined' ? `${window.location.origin}/agent` : '';

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      // First get the event details
      const eventData = await api.getEventBySlug(slug);
      setEvent(eventData);

      // Then get the agent codes
      const codes = await api.getEventAgentCodes(eventData.id);
      setAgentCodes(codes);
      
      if (isRefresh) {
        success('Data refreshed!');
      }
    } catch (err: any) {
      error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateCode = async () => {
    if (!event) return;

    try {
      setCreating(true);
      const newCode = await api.createAgentCode(event.id, newLabel || undefined);
      // Add missing fields with default values for newly created codes
      const codeWithDefaults: AgentCode = {
        ...newCode,
        activatedAt: null,
        lastUsedAt: null,
      };
      setAgentCodes([codeWithDefaults, ...agentCodes]);
      setNewLabel('');
      setShowCreateDialog(false);
      success('Agent access code created successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to create agent code');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success('Code copied to clipboard!');
  };

  const handleCopyShareLink = (code: string) => {
    const shareText = `Use this code to check in tickets:\n\nAccess Code: ${code}\nPortal: ${agentPortalUrl}`;
    navigator.clipboard.writeText(shareText);
    success('Share link copied to clipboard!');
  };

  const handleToggleActive = async (codeId: string, currentlyActive: boolean) => {
    try {
      setTogglingId(codeId);
      if (currentlyActive) {
        await api.deactivateAgentCode(codeId);
      } else {
        await api.reactivateAgentCode(codeId);
      }
      setAgentCodes(
        agentCodes.map((c) =>
          c.id === codeId ? { ...c, isActive: !currentlyActive } : c
        )
      );
      success(`Agent code ${currentlyActive ? 'deactivated' : 'reactivated'}!`);
    } catch (err: any) {
      error(err.message || 'Failed to update agent code');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteCode = async () => {
    if (!deleteDialog.code) return;
    
    try {
      setDeletingId(deleteDialog.code.id);
      await api.deleteAgentCode(deleteDialog.code.id);
      setAgentCodes(agentCodes.filter((c) => c.id !== deleteDialog.code!.id));
      success('Agent code deleted successfully!');
      setDeleteDialog({ open: false, code: null });
    } catch (err: any) {
      error(err.message || 'Failed to delete agent code');
    } finally {
      setDeletingId(null);
    }
  };

  const totalCheckIns = agentCodes.reduce((sum, code) => sum + code.checkInCount, 0);
  const activeCodesCount = agentCodes.filter((c) => c.isActive).length;

  if (loading) {
    return (
      <div className="container max-w-4xl py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/events/${slug}/analytics`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Check-in Agents</h1>
            <p className="text-sm text-muted-foreground">{event?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Agent Access Code</DialogTitle>
                <DialogDescription>
                  Generate a new access code for an agent to scan tickets at your event.
                  The code will be 9 characters long and can be shared with your check-in staff.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Agent Label (Optional)</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Gate 1, John, VIP Entrance"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCode()}
                    maxLength={50}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps you identify which agent checked in which tickets.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCode} disabled={creating}>
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate Code
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agentCodes.length}</p>
                <p className="text-sm text-muted-foreground">Total Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-lg shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCodesCount}</p>
                <p className="text-sm text-muted-foreground">Active Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-lg shrink-0">
                <UserCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCheckIns}</p>
                <p className="text-sm text-muted-foreground">Total Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Portal Link */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                <ExternalLink className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Agent Check-in Portal</p>
                <p className="text-sm text-muted-foreground">Share this URL with your agents</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <code className="px-3 py-1.5 bg-white border rounded text-sm font-mono flex-1 sm:flex-none truncate">
                {agentPortalUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(agentPortalUrl);
                  success('Portal URL copied!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Codes List */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Access Codes</CardTitle>
          <CardDescription>
            Create and manage access codes for your check-in staff. Each code is unique and can be tracked individually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentCodes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <QrCode className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Agent Codes Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                Create access codes for your check-in agents. They can use these codes to scan tickets at the event without needing an account.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Code
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {agentCodes.map((code) => (
                <div
                  key={code.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg transition-colors ${
                    code.isActive 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-gray-50/50 opacity-70'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="font-mono text-base sm:text-lg font-bold tracking-widest bg-gray-100 px-3 py-2 rounded select-all">
                      {code.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium truncate">
                          {code.label || 'Unnamed Agent'}
                        </span>
                        <Badge 
                          variant={code.isActive ? 'default' : 'secondary'}
                          className={code.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                        >
                          {code.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {code.activatedAt && (
                          <Badge variant="outline" className="text-xs">
                            Used
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" />
                          {code.checkInCount} check-in{code.checkInCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {code.lastUsedAt 
                            ? `Last: ${formatDate(code.lastUsedAt, 'short')}`
                            : 'Never used'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto sm:ml-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyShareLink(code.code)}
                      title="Copy share message"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(code.code)}
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(code.id, code.isActive)}
                      disabled={togglingId === code.id}
                      title={code.isActive ? 'Deactivate' : 'Reactivate'}
                    >
                      {togglingId === code.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : code.isActive ? (
                        <XCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteDialog({ open: true, code })}
                      title="Delete code"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, code: open ? deleteDialog.code : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Agent Code
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent code? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteDialog.code && (
            <div className="py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="font-mono text-lg font-bold tracking-widest mb-2">
                  {deleteDialog.code.code}
                </div>
                <p className="text-sm text-muted-foreground">
                  {deleteDialog.code.label || 'Unnamed Agent'} • {deleteDialog.code.checkInCount} check-ins
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, code: null })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCode}
              disabled={deletingId === deleteDialog.code?.id}
            >
              {deletingId === deleteDialog.code?.id ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Code
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium">Generate Access Codes</p>
                <p className="text-sm text-muted-foreground">
                  Create unique 9-character codes for each agent or check-in point.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium">Share with Agents</p>
                <p className="text-sm text-muted-foreground">
                  Give the codes to your staff. No account needed.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium">Agents Scan Tickets</p>
                <p className="text-sm text-muted-foreground">
                  Agents visit the portal, enter their code, and start scanning.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-medium">Track Check-ins</p>
                <p className="text-sm text-muted-foreground">
                  Monitor check-in counts per agent in real-time.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
