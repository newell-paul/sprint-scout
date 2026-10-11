import { connect } from "./connection";
import { migrate } from "./schema";
const sql = connect();
try {
  await migrate(sql);
  console.log("Demo migration complete");
} finally {
  await sql.end();
}
