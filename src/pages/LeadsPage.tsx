import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Mail, Trash2, Users, Calendar, TrendingUp, Search, RefreshCw } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useLeads } from '@/hooks/useLeads';
import { useToast } from '@/hooks/use-toast';
import { parseImages } from '@/utils/imageUtils';
import logo from '@/assets/logo.png';

const LeadsPage = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { leads, loading, stats, deleteLead, resendRewardEmail, exportToCSV, refetch } = useLeads({ search: debouncedSearch });
  const { toast } = useToast();

  const handleSearch = (value: string) => {
    setSearch(value);
    // Simple debounce
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleDelete = async (id: string) => {
    const success = await deleteLead(id);
    if (success) {
      toast({ title: 'Lead deleted' });
    } else {
      toast({ title: 'Error deleting lead', variant: 'destructive' });
    }
  };

  const handleResendEmail = async (id: string) => {
    const result = await resendRewardEmail(id);
    if (result.success) {
      toast({ title: 'Email sent successfully' });
    } else {
      toast({ title: 'Error sending email', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-6">
            <AppHeader />
          </div>
          
          <h1 className="text-3xl font-light tracking-tight text-foreground mb-2">
            Leads Dashboard
          </h1>
          <p className="text-muted-foreground font-light">
            Manage and track all captured leads from your activations.
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={leads.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No leads yet</h3>
                <p className="text-muted-foreground">
                  Leads will appear here when users submit your lead capture forms.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Activation</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.email}</p>
                          {lead.name && <p className="text-sm text-muted-foreground">{lead.name}</p>}
                          {lead.phone && <p className="text-sm text-muted-foreground">{lead.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.product ? (
                          <Link 
                            to={`/product/${lead.product.slug}`}
                            className="flex items-center gap-2 group"
                          >
                            {(() => {
                              const images = parseImages(lead.product.images);
                              const thumb = images.length > 0 ? images[0] : null;
                              return thumb ? (
                                <img src={thumb} alt={lead.product.name} className="w-8 h-8 rounded object-cover shrink-0 border border-border" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted shrink-0" />
                              );
                            })()}
                            <span className="text-primary group-hover:underline truncate">
                              {lead.product.name}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.activation?.name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.reward_code && (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {lead.reward_code}
                            </code>
                          )}
                          <div className="flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {lead.reward_type === 'code_email' ? 'Email' : 'Screen'}
                            </Badge>
                            {lead.reward_type === 'code_email' && (
                              <Badge 
                                variant={lead.reward_sent ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {lead.reward_sent ? 'Sent' : 'Pending'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {lead.reward_type === 'code_email' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleResendEmail(lead.id)}
                              title="Resend email"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                title="Delete lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete lead?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the lead for {lead.email}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeadsPage;
