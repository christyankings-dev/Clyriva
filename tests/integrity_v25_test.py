"""Regressões v2.5: integridade entre guias, avisos, documentos e validação de CPF."""
import unittest
from built_site import assert_js, source_text
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL = source_text('apps/panel')
CORE = source_text('shared/domain/workspace')
EDGE = (ROOT / "edge-functions/clyriva-client/index.ts").read_text()
ADMIN = source_text('apps/notices')


class IntegrityV25(unittest.TestCase):
    def test_cpf_verifier_and_panel(self):
        assert_js(self, "function validCpf(value", CORE)
        assert_js(self, "validCpf, validDate", CORE)
        assert_js(self, "if(!validCpf(cleaned)&&!validCnpj(cleaned))", PANEL)
        assert_js(self, "values.value<0", PANEL)

    def test_file_list_is_per_record_and_authorized(self):
        assert_js(self, "internalDocsApi('list',{entityType:type,entityId:recordId})", PANEL)
        self.assertIn("if(scoped&&!owner)return fail(", EDGE)
        self.assertIn(".eq('entity_type',owner.type).eq('entity_id',owner.id).eq('client_id',owner.clientId)", EDGE)
        self.assertIn(".limit(owner?5:1500)", EDGE)

    def test_linked_notices_cannot_be_paid_or_edited_separately(self):
        self.assertIn("source_type,source_id", EDGE)
        for marker in ["if(action==='mark-paid')", "if(action==='reopen-charge')", "if(action==='update-charge')"]:
            section = EDGE.split(marker, 1)[1].split("\n  }", 1)[0]
            self.assertIn(".is('source_type',null)", section, marker)
        assert_js(self, "linked=Boolean(n.source_type&&n.source_id)", ADMIN)
        assert_js(self, "if(bill&&n.status==='paid'&&!linked)", ADMIN)
        assert_js(self, "if(!linked){", ADMIN)

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
