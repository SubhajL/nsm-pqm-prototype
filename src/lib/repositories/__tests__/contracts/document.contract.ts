import { describe, expect, it, beforeEach } from 'vitest';
import type { DocumentFile, Folder, VersionEntry } from '@/types/document';
import type { DocumentRepository } from '../../document.repository';

export function runDocumentRepositoryContract(
  makeRepo: () => Promise<DocumentRepository> | DocumentRepository,
) {
  describe('DocumentRepository contract', () => {
    let repo: DocumentRepository;
    const projectId = 'proj-doc-contract';

    beforeEach(async () => {
      repo = await makeRepo();
    });

    function sampleFolder(id: string): Folder {
      return {
        id,
        name: `Folder ${id}`,
        parentId: null,
        fileCount: 0,
      };
    }

    function sampleFile(id: string, folderId: string): DocumentFile {
      return {
        id,
        folderId,
        name: `${id}.pdf`,
        type: 'pdf',
        version: 1,
        size: '1 KB',
        uploadedBy: 'Tester',
        uploadedAt: '2026-06-01T00:00:00.000Z',
        status: 'draft',
        workflow: ['submitted', 'pending', 'pending'],
      };
    }

    it('addFolder + addFile + getDataForProject round-trip', async () => {
      const folder = await repo.addFolder(projectId, sampleFolder('fld-doc-c-1'));
      const file = await repo.addFile(projectId, sampleFile('file-doc-c-1', folder.id));
      const data = await repo.getDataForProject(projectId);
      expect(data.folders.some((f) => f.id === folder.id)).toBe(true);
      expect(data.files.some((f) => f.id === file.id)).toBe(true);
    });

    it('uploadVersion + lockVersion guards the head version', async () => {
      const folder = await repo.addFolder(projectId, sampleFolder('fld-doc-c-2'));
      const file = await repo.addFile(projectId, sampleFile('file-doc-c-2', folder.id));
      const next: VersionEntry = {
        version: file.version + 1,
        date: '2026-07-01T00:00:00.000Z',
        author: 'Tester',
        note: 'v2',
      };
      const v2 = await repo.uploadVersion(projectId, file.id, next);
      expect(v2?.version).toBe(2);

      const locked = await repo.lockVersion(projectId, file.id);
      expect(locked?.versionLocked).toBe(true);
    });

    it('lockVersion returns null when the file/version is unknown', async () => {
      expect(await repo.lockVersion(projectId, 'no-such-file')).toBeNull();
    });

    it('deleteFile removes the file and its version history', async () => {
      const folder = await repo.addFolder(projectId, sampleFolder('fld-doc-c-3'));
      const file = await repo.addFile(projectId, sampleFile('file-doc-c-3', folder.id));
      const deleted = await repo.deleteFile(projectId, file.id);
      expect(deleted?.id).toBe(file.id);
      const data = await repo.getDataForProject(projectId);
      expect(data.files.some((f) => f.id === file.id)).toBe(false);
    });

    it('deleteFolder cascades to nested files', async () => {
      const folder = await repo.addFolder(projectId, sampleFolder('fld-doc-c-4'));
      const file = await repo.addFile(projectId, sampleFile('file-doc-c-4', folder.id));
      const deleted = await repo.deleteFolder(projectId, folder.id);
      expect(deleted?.id).toBe(folder.id);
      const data = await repo.getDataForProject(projectId);
      expect(data.folders.some((f) => f.id === folder.id)).toBe(false);
      expect(data.files.some((f) => f.id === file.id)).toBe(false);
    });
  });
}
