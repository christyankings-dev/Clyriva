"""Regressões estáticas para integração segura dos anexos (sem acesso a dados reais)."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
panel=(ROOT/'panel.js').read_text()
edge=(ROOT/'edge-functions/clyriva-client/index.ts').read_text()
html=(ROOT/'admin.html').read_text()
migration=(ROOT/'db/migrations/20261120_v24_internal_documents.sql').read_text()
link=(ROOT/'db/migrations/20261120_v24_link_publication.sql').read_text()
class InternalDocsTest(unittest.TestCase):
 def test_file_input_both_forms(self):
  self.assertIn("if(type==='tax'||type==='task')",panel)
  self.assertIn('id="f-internal-doc"',panel)
  self.assertIn("openInternalDocs('tax',record.id,file)",panel)
  self.assertIn("openInternalDocs('task',record.id,file)",panel)
 def test_admin_auth_bridge(self):
  self.assertIn('window.parent?.ClyrivaPanelHost?.token?.(window)',panel)
  self.assertIn("'/functions/v1/clyriva-client'",panel)
  self.assertIn("'/admin-internal-'+action",panel)
  self.assertNotIn('clyriva-internal-docs',panel)
 def test_upload_handshake(self):
  for snippet in ["internalDocsApi('start',{entityType:type,entityId:recordId", "start.attachmentId", "internalDocsApi('complete',{attachmentId:start.attachmentId}", "'.from('clyriva-client-attachments')"]:
   self.assertTrue(snippet.replace("'.from", ".from") in panel,snippet)
 def test_download_requires_server_signature(self):
  self.assertIn("internalDocsApi('link',{attachmentId:doc.id",panel)
  self.assertIn(".eq('id',id).eq('admin_id',uid)",edge)
  self.assertIn('createSignedUrl(doc.storage_path,60',edge)
 def test_private_permissions(self):
  self.assertIn('enable row level security',migration.lower())
  self.assertIn('revoke all on public.clyriva_internal_attachments from public,anon,authenticated',migration.lower())
 def test_explicit_publication(self):
  self.assertIn('disponibilizar este lançamento',panel.lower())
  self.assertIn("if(action==='internal-publish'||action==='internal-sync')",edge)
  self.assertIn('create unique index if not exists clyriva_notice_source_unique',link.lower())
  self.assertIn('source_attachment_id',edge)
 def test_no_automatic_publish_when_creating(self):
  self.assertIn("internalDocsApi(quiet?'sync':'publish'",panel)
  self.assertIn("if(action==='internal-sync'&&!found)return response({ok:true,skipped:true})",edge)
 def test_done_paid_and_delete_handling(self):
  self.assertIn("source.status==='paid'?'paid':'active'",edge)
  self.assertIn("source.status==='done'?'archived':'active'",edge)
  self.assertIn("internalDocsApi('unpublish'",panel)
  self.assertIn("if(internalEntity(payload,kind,entityId))return fail",edge)
 def test_only_one_vendor_script(self):
  self.assertEqual(html.count('src="vendor/supabase.js"'),1)
 def test_file_size_limit(self):
  self.assertIn('5242880',panel)
  self.assertIn('5*1024*1024',edge)
if __name__=='__main__':unittest.main()
