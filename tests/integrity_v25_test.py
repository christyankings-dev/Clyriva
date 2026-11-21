"""Regressões v2.5: integridade entre guias, avisos, documentos e validação de CPF."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = (ROOT / "panel.js").read_text()
CORE = (ROOT / "core.js").read_text()
EDGE = (ROOT / "edge-functions/clyriva-client/index.ts").read_text()
ADMIN = (ROOT / "avisos-admin.js").read_text()


class IntegrityV25(unittest.TestCase):
    def test_cpf_verifier_and_panel(self):
        self.assertIn("function validCpf(value)", CORE)
        self.assertIn("validCpf, validDate", CORE)
        self.assertIn("if(!validCpf(cleaned)&&!validCnpj(cleaned))", PANEL)
        self.assertIn("v.value<0", PANEL)

    def test_file_list_is_per_record_and_authorized(self):
        self.assertIn("internalDocsApi('list',{entityType:type,entityId:recordId})", PANEL)
        self.assertIn("if(scoped&&!owner)return fail(", EDGE)
        self.assertIn(".eq('entity_type',owner.type).eq('entity_id',owner.id).eq('client_id',owner.clientId)", EDGE)
        self.assertIn(".limit(owner?5:1500)", EDGE)

    def test_linked_notices_cannot_be_paid_or_edited_separately(self):
        self.assertIn("source_type,source_id", EDGE)
        for marker in ["if(action==='mark-paid')", "if(action==='reopen-charge')", "if(action==='update-charge')"]:
            section = EDGE.split(marker, 1)[1].split("\n  }", 1)[0]
            self.assertIn(".is('source_type',null)", section, marker)
        self.assertIn("linked=Boolean(n.source_type&&n.source_id)", ADMIN)
        self.assertIn("if(bill&&n.status==='paid'&&!linked)", ADMIN)
        self.assertIn("if(!linked){", ADMIN)

    def test_manual_archival_is_preserved(self):
        self.assertIn("if(action==='internal-sync'&&found?.status==='archived')", EDGE)
        self.assertIn("if(found)delete data.body", EDGE)

    def test_public_documents_stay_private(self):
        self.assertIn("createSignedUrl(doc.storage_path,60", EDGE)
        self.assertIn("if(action==='internal-unpublish')", EDGE)
        self.assertIn("const scope=await activeGrants(uid);", EDGE)
        self.assertNotIn("getPublicUrl(", EDGE)


if __name__ == "__main__":
    unittest.main()
