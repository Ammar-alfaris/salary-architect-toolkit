import { useMemo, useState, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface Props<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  empty?: ReactNode;
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  onRowClick?: (r: T) => void;
  bulkActions?: (selected: T[]) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  rows, columns, loading, empty, pageSize = 25, searchable, searchKeys, onRowClick, bulkActions,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !q.trim()) return rows;
    const ql = q.toLowerCase();
    return rows.filter((r) =>
      (searchKeys ?? Object.keys(r) as (keyof T)[]).some((k) => {
        const v = r[k];
        return v != null && String(v).toLowerCase().includes(ql);
      })
    );
  }, [rows, q, searchable, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    arr.sort((a: any, b: any) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const allSel = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSel) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const sort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div className="space-y-3">
      {(searchable || bulkActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search…" className="h-9 max-w-xs" />
          )}
          {selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 ms-auto">
              <span className="text-xs text-muted-foreground">{selectedRows.length} selected</span>
              {bulkActions(selectedRows)}
            </div>
          )}
        </div>
      )}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50">
            <TableRow>
              {bulkActions && (
                <TableHead className="w-10">
                  <Checkbox checked={allSel} onCheckedChange={toggleAll} />
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead key={c.key} style={{ width: c.width }} className={c.className}>
                  {c.sortable ? (
                    <button onClick={() => sort(c.key)} className="inline-flex items-center gap-1 font-medium">
                      {c.header}
                      {sortKey === c.key && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  ) : c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={columns.length + (bulkActions ? 1 : 0)} className="text-center text-sm text-muted-foreground py-10">Loading…</TableCell></TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + (bulkActions ? 1 : 0)} className="text-center text-sm text-muted-foreground py-10">{empty ?? "No data"}</TableCell></TableRow>
            ) : pageRows.map((r) => (
              <TableRow key={r.id} className={onRowClick ? "cursor-pointer" : ""} onClick={() => onRowClick?.(r)}>
                {bulkActions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>{c.cell(r)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sorted.length} rows · page {page + 1} / {pages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
