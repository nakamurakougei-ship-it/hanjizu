import { SheetPreview } from "@/components/SheetPreview";
import {
  bundleByMaterial,
  membersFromAnswers,
} from "@/lib/box";
import type { QaAnswers } from "@/lib/qa";

export function MemberList({ answers }: { answers: QaAnswers }) {
  if (answers.product !== "箱" && answers.product !== "パネル") return null;
  const members = membersFromAnswers(answers);
  const bundles = bundleByMaterial(members);
  if (bundles.length === 0) return null;
  const faces = members.filter((item) => item.name.startsWith("面材"));

  return (
    <div className="parts">
      {answers.product === "パネル"
        ? faces.map((item) => <SheetPreview key={item.id} member={item} />)
        : null}
      {bundles.map((bundle) => (
        <section key={bundle.key} className="parts-bundle">
          <h2 className="parts-key">{bundle.key}</h2>
          <table className="parts-table">
            <thead>
              <tr>
                <th>部材</th>
                <th>長さ</th>
                <th>巾</th>
                <th>厚</th>
                <th>枚</th>
              </tr>
            </thead>
            <tbody>
              {bundle.members.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.length}</td>
                  <td>{item.width}</td>
                  <td>{item.thickness}</td>
                  <td>{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
