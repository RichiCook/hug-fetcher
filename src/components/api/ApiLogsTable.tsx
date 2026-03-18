import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { ApiLog, ApiIntegration } from "@/hooks/useApiIntegrations";
import { format } from "date-fns";

interface ApiLogsTableProps {
  logs: ApiLog[];
  integrations: ApiIntegration[];
}

export const ApiLogsTable = ({ logs, integrations }: ApiLogsTableProps) => {
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getIntegrationName = (id: string | null) => {
    if (!id) return "Unknown";
    const integration = integrations.find((i) => i.id === id);
    return integration?.name || "Deleted";
  };

  const filteredLogs = logs.filter((log) => {
    if (directionFilter !== "all" && log.direction !== directionFilter) return false;
    if (statusFilter !== "all" && log.status !== statusFilter) return false;
    if (searchTerm) {
      const integrationName = getIntegrationName(log.integration_id).toLowerCase();
      return integrationName.includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const statusColors: Record<string, "default" | "destructive" | "secondary"> = {
    success: "default",
    error: "destructive",
    pending: "secondary",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by integration..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Direction</TableHead>
              <TableHead>Integration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {log.direction === "inbound" ? (
                        <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      )}
                      <span className="capitalize">{log.direction}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getIntegrationName(log.integration_id)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[log.status]}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Log Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {log.error_message && (
                            <div>
                              <label className="text-sm font-medium text-destructive">Error</label>
                              <pre className="p-3 bg-destructive/10 rounded text-sm mt-1 whitespace-pre-wrap">
                                {log.error_message}
                              </pre>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium">Payload</label>
                            <pre className="p-3 bg-muted rounded text-sm mt-1 overflow-auto">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
