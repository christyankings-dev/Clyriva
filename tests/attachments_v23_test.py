"""Testes da estrutura do anexo privado (não usam dados reais)."""
from built_site import assert_js, source_text
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]

class DocumentsV23(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls.edge=(ROOT/'edge-functions/clyriva-client/index.ts').read_text()
    cls.admin=source_text('apps/notices')
    cls.client=source_text('apps/client')
    cls.migration=(ROOT/'db/migrations/20261120_v23_private_attachments.sql').read_text()
  def test_bucket_private_and_mime_restricted(self):
    self.assertIn("false,5242880,array['application/pdf','image/jpeg','image/png']",self.migration)
    self.assertIn('alter table public.clyriva_notice_attachments enable row level security',self.migration)
    self.assertIn('revoke all on public.clyriva_notice_attachments from public,anon,authenticated',self.migration)
  def test_file_size_types_and_magic_validation(self):
    for t in ['application/pdf','image/jpeg','image/png']:
      self.assertIn(t,self.edge)
    self.assertIn('bytes.length!==a.size_bytes',self.edge)
    self.assertIn('validFileHeader(bytes,a.mime_type)',self.edge)
    self.assertIn('DOC_MAX=5*1024*1024',self.edge)
  def test_access_authorization_for_attachment_link(self):
    self.assertIn('authorizedAttachment(uid,body?.attachmentId,management)',self.edge)
    self.assertIn('activeGrants(uid)',self.edge)
    self.assertIn('admin_id',self.edge)
    self.assertIn("createSignedUrl(a.storage_path,60",self.edge)
    self.assertNotIn('getPublicUrl(',self.edge)
  def test_upload_uses_signed_url_only(self):
    self.assertIn('createSignedUploadUrl(path)',self.edge)
    assert_js(self, 'uploadToSignedUrl(start.path,start.token,file',self.admin)
    assert_js(self, 'attachment-complete',self.admin)
  def test_admin_client_buttons(self):
    for t in ['Visualizar','Baixar','Adicionar documento','Remover']:
      assert_js(self, t,self.admin)
    assert_js(self, 'client-attachment-link',self.client)
    self.assertIn('attachments:',self.edge)
  def test_no_document_in_push(self):
    self.assertIn('const GENERIC=',self.edge)
    self.assertIn('reminderText(current,stage',self.edge)
    self.assertNotIn('storage_path,admin_id,client_id',self.client)
  def test_notice_failure_does_not_duplicate_charge(self):
    assert_js(self, 'f.dataset.editId=String(result.noticeId||payload.noticeId)',self.admin)
    assert_js(self, 'uploadAttachment(String(result.noticeId||payload.noticeId),file)',self.admin)

if __name__=='__main__':unittest.main()
