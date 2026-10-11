import { connect } from "./connection";
import { seed } from "./schema";
const sql = connect();
try {
  await seed(sql);
  console.log("Synthetic demo seed complete");
} finally {
  await sql.end();
}
