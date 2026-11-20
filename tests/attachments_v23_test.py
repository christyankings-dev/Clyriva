"""Testes da estrutura do anexo privado (não usam dados reais)."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]

class DocumentsV23(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls.edge=(ROOT/'edge-functions/clyriva-client/index.ts').read_text()
    cls.admin=(ROOT/'avisos-admin.js').read_text()
    cls.client=(ROOT/'cliente.js').read_text()
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
    self.assertIn('uploadToSignedUrl(start.path,start.token,file',self.admin)
    self.assertIn('attachment-complete',self.admin)
  def test_admin_client_buttons(self):
    for t in ['Visualizar','Baixar','Adicionar documento','Remover']:
      self.assertIn(t,self.admin)
    self.assertIn('client-attachment-link',self.client)
    self.assertIn('attachments:',self.edge)
  def test_no_document_in_push(self):
    self.assertIn('const GENERIC=',self.edge)
    self.assertIn('reminderText(current,stage',self.edge)
    self.assertNotIn('storage_path,admin_id,client_id',self.client)
  def test_notice_failure_does_not_duplicate_charge(self):
    self.assertIn('f.dataset.editId=result.noticeId||payload.noticeId',self.admin)
    self.assertIn('uploadAttachment(result.noticeId||payload.noticeId,file)',self.admin)

if __name__=='__main__':unittest.main()
