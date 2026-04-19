import { useMemo, useState } from "react";
import { STUDENTS_MOCK } from "./students-mock";

export function useStudentsTable() {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return STUDENTS_MOCK;

    return STUDENTS_MOCK.filter((student) => {
      return (
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.enrollment.toLowerCase().includes(q) ||
        student.career.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const rows = useMemo(() => {
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, pageIndex, pageSize]);

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  function previousPage() {
    if (!canPreviousPage) return;
    setPageIndex((current) => current - 1);
  }

  function nextPage() {
    if (!canNextPage) return;
    setPageIndex((current) => current + 1);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }

  return {
    rows,
    search,
    setSearch,
    pageIndex,
    pageCount,
    pageSize,
    setPageSize: handlePageSizeChange,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    summary: `Mostrando ${rows.length} de ${filteredRows.length} estudiantes`,
  };
}
