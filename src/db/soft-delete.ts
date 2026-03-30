import { isNull } from "drizzle-orm";
import type { SQL, SQLWrapper } from "drizzle-orm";

interface SoftDeletableTable {
  deletedAt: SQLWrapper;
}

export const notDeleted = <TTable extends SoftDeletableTable>(
  table: TTable
): SQL => isNull(table.deletedAt);
