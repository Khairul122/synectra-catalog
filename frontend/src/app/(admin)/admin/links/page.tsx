'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { notify } from '@/components/shared/message-dialog';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, Globe, GripVertical, Link2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/services/api';
import type { Link as LinkType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const errText = (err: unknown) => (err instanceof Error ? err.message : undefined);

export default function AdminLinksPage() {
  const { token } = useAdmin();
  const { t } = useI18n();
  const [links, setLinks] = useState<LinkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LinkType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({ title: '', url: '', is_active: true });
  const [formError, setFormError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchLinks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.adminGetLinks(token);
      setLinks([...data].sort((a, b) => a.sort_order - b.sort_order));
    } catch (err: unknown) {
      setError(errText(err) ?? t('links.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [token]);

  const handleOpenModal = (link?: LinkType) => {
    setEditingLink(link ?? null);
    setFormData(link ? { title: link.title, url: link.url, is_active: link.is_active } : { title: '', url: '', is_active: true });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!formData.title.trim() || !formData.url.trim()) return setFormError(t('links.errRequired'));
    try {
      new URL(formData.url.trim());
    } catch {
      return setFormError(t('links.errUrl'));
    }

    try {
      setSaving(true);
      const payload = { title: formData.title.trim(), url: formData.url.trim(), is_active: formData.is_active };
      if (editingLink) {
        const updated = await api.adminUpdateLink(token, editingLink.id, payload);
        setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const nextOrder = links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) + 1 : 1;
        const created = await api.adminCreateLink(token, { ...payload, sort_order: nextOrder });
        setLinks((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      }
      notify.success(editingLink ? t('links.updated') : t('links.added'), { description: payload.title });
      setShowModal(false);
    } catch (err: unknown) {
      setFormError(errText(err) ?? t('links.saveFailed'));
      notify.error(t('links.saveFailed'), { description: errText(err) });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      setDeleting(true);
      await api.adminDeleteLink(token, deleteTarget.id);
      setLinks((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      notify.success(t('links.deleted'), { description: deleteTarget.title });
      setDeleteTarget(null);
    } catch (err: unknown) {
      notify.error(t('links.deleteFailed'), { description: errText(err) });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (link: LinkType) => {
    if (!token) return;
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)));
    try {
      const updated = await api.adminUpdateLink(token, link.id, { is_active: !link.is_active });
      setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch (err: unknown) {
      setLinks((prev) => prev.map((l) => (l.id === link.id ? link : l)));
      notify.error(t('links.toggleFailed'), { description: errText(err) });
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!token || !over || active.id === over.id) return;
    const previous = links;
    const from = links.findIndex((l) => l.id === active.id);
    const to = links.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(links, from, to).map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setLinks(reordered);
    try {
      await api.adminReorderLinks(token, reordered.map(({ id, sort_order }) => ({ id, sort_order })));
      notify.success(t('links.orderSaved'));
    } catch (err: unknown) {
      setLinks(previous);
      notify.error(t('links.orderFailed'), { description: errText(err) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('links.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('links.sub')}</p>
        </div>
        <Button variant="brand" onClick={() => handleOpenModal()}>
          <Plus /> {t('links.add')}
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchLinks} retrying={loading} />
      ) : loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={t('links.empty')}
          description={t('links.emptySub')}
          action={<Button variant="brand" onClick={() => handleOpenModal()}><Plus /> {t('links.add')}</Button>}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {links.map((link) => (
                <SortableRow key={link.id} link={link} onEdit={() => handleOpenModal(link)} onDelete={() => setDeleteTarget(link)} onToggle={() => handleToggleActive(link)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={showModal} onOpenChange={(o) => !saving && setShowModal(o)}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLink ? t('links.edit') : t('links.new')}</DialogTitle>
            <DialogDescription>{t('links.formDesc')}</DialogDescription>
          </DialogHeader>
          <form id="link-form" onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="link-title">{t('links.fieldTitle')}</Label>
              <Input id="link-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={t('links.titlePlaceholder')} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" type="url" value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." />
            </div>
            <label className="flex items-center justify-between rounded-xl border bg-muted/40 p-3 text-sm font-medium">
              {t('common.showInStore')}
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
            </label>
            <AnimatePresence>
              {formError && (
                <motion.p role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, 0] }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </motion.p>
              )}
            </AnimatePresence>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button type="submit" form="link-form" variant="brand" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('links.confirmDelete', { title: deleteTarget?.title ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('links.confirmDeleteSub')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="animate-spin" />} {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableRow({ link, onEdit, onDelete, onToggle }: { link: LinkType; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'glass flex items-center gap-3 rounded-2xl p-3 pr-4 transition-shadow animate-in fade-in slide-in-from-bottom-2 duration-300',
        isDragging ? 'z-10 scale-[1.02] shadow-glow ring-2 ring-primary/40' : 'hover:shadow-md',
        !link.is_active && 'opacity-60',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={t('links.drag', { title: link.title })}
        className="cursor-grab touch-none rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Globe className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{link.title}</p>
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary">
          <span className="truncate">{link.url}</span> <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </div>
      <Switch checked={link.is_active} onCheckedChange={onToggle} aria-label={t('common.showInStore')} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={t('common.edit')}><Pencil /></Button>
        </TooltipTrigger>
        <TooltipContent>{t('common.edit')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={t('common.delete')} className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 /></Button>
        </TooltipTrigger>
        <TooltipContent>{t('common.delete')}</TooltipContent>
      </Tooltip>
    </li>
  );
}
