import { DataTable } from "@/shared/components/ui/data-table";
import { StudentsCards } from "./students-cards";
import { StudentsFiltersBar } from "./students-filters-bar";
import { StudentsTable } from "./students-table";
import { StudentsToolbarActions } from "./students-toolbar-actions";
import { useStudentsTable } from "./use-students-table";

export function StudentsDataTableShowcase() {
  const {
    rows,
    search,
    setSearch,
    pageIndex,
    pageCount,
    pageSize,
    setPageSize,
    canPreviousPage,
    canNextPage,
    previousPage,
    nextPage,
    summary,
  } = useStudentsTable();

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Showcase DataTable: Estudiantes</h2>
        <p className="text-sm text-muted-foreground">
          Gestión de estudiantes habilitados para el acceso SSO a eLibro.
        </p>
      </div>

      <DataTable
        title="Listado de estudiantes"
        meta={`${rows.length} registros visibles`}
        search={{
          placeholder: "Buscar por nombre, matrícula o correo...",
          value: search,
          onChange: setSearch,
        }}
        toolbarRight={<StudentsToolbarActions />}
        toolbarBelow={<StudentsFiltersBar />}
        renderTable={() => <StudentsTable rows={rows} />}
        renderCards={() => <StudentsCards rows={rows} />}
        tableLabel="Tabla"
        cardsLabel="Cards"
        pagination={{
          summary,
          pageIndex,
          pageCount,
          pageSize,
          canPreviousPage,
          canNextPage,
          onPreviousPage: previousPage,
          onNextPage: nextPage,
          onPageSizeChange: setPageSize,
        }}
      />
    </section>
  );
}
