'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Link2, Loader2, MoreVertical, Package, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/services/api';
import { formatRupiah } from '@/lib/utils';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, ErrorState } from '@/components/shared/feedback';
import { Dropzone, putWithProgress } from '@/components/shared/dropzone';
import { useI18n } from '@/lib/i18n';

const EMPTY_FORM = {
  title: '',
  description: '',
  price: '',
  category: '',
  is_active: true,
  thumbnail_file: null as File | null,
  delivery_url: '',
};

export default function AdminProductsPage() {
  const { token } = useAdmin();
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState<number | null>(null);

  const fetchProducts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setProducts(await api.adminGetProducts(token));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('products.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const uploadThumbnail = async (file: File): Promise<string> => {
    if (!token) throw new Error('Token tidak ditemukan');
    setProgress(0);
    const { uploadUrl, path, publicUrl } = await api.adminGenerateUploadUrl(token, 'public-assets', file.name);
    await putWithProgress(uploadUrl, file, setProgress, locale);
    return publicUrl ?? path;
  };

  const openModal = (product?: Product) => {
    setEditingProduct(product ?? null);
    setFormData(
      product
        ? { ...EMPTY_FORM, title: product.title, description: product.description, price: String(product.price), category: product.category, is_active: product.is_active, delivery_url: product.delivery_url ?? '' }
        : EMPTY_FORM,
    );
    setThumbnailPreview(product?.thumbnail_url ?? null);
    setProgress(null);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const { thumbnail_file, ...rest } = formData;
    rest.delivery_url = rest.delivery_url.trim();
    if (!rest.title || !rest.price || !rest.category) return setFormError(t('products.errRequired'));
    if (rest.description.trim().length < 10) return setFormError(t('products.errDesc'));
    if (!/^https?:\/\/\S+\.\S+/i.test(rest.delivery_url)) return setFormError(t('products.errLink'));
    if (!editingProduct && !thumbnail_file) return setFormError(t('products.errFiles'));

    setSaving(true);
    setFormError(null);
    try {
      let thumbnailPath = editingProduct?.thumbnail_url || null;
      if (thumbnail_file) thumbnailPath = await uploadThumbnail(thumbnail_file);

      const dto = { ...rest, price: Number(rest.price), thumbnail_url: thumbnailPath };
      if (editingProduct) await api.adminUpdateProduct(token, editingProduct.id, dto);
      else await api.adminCreateProduct(token, dto);

      toast.success(editingProduct ? t('products.updated') : t('products.added'), { description: rest.title });
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('products.saveFailed');
      setFormError(message);
      toast.error(t('products.saveFailed'), { description: message });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteProduct(token, deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success(t('products.deleted'), { description: deleteTarget.title });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(t('products.deleteFailed'), { description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (product: Product) => {
    if (!token) return;
    // Optimistic: flip immediately, roll back on failure.
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p)));
    try {
      await api.adminUpdateProduct(token, product.id, { is_active: !product.is_active });
      toast.success(product.is_active ? t('products.hidden') : t('products.shown'), { description: product.title });
    } catch (err) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: product.is_active } : p)));
      toast.error(t('products.toggleFailed'), { description: err instanceof Error ? err.message : undefined });
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('products.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('products.count', { n: products.length, active: products.filter((p) => p.is_active).length })}</p>
        </div>
        <Button variant="brand" onClick={() => openModal()}>
          <Plus /> {t('products.add')}
        </Button>
      </div>

      <div className="relative sm:w-80">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('products.search')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={fetchProducts} retrying={loading} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? t('products.empty') : t('products.noMatch')}
          description={products.length === 0 ? t('products.emptySub') : t('products.noMatchSub')}
          action={products.length === 0 && <Button variant="brand" onClick={() => openModal()}><Plus /> {t('products.add')}</Button>}
        />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -3 }}
                className={`glass group flex gap-4 rounded-2xl p-3 transition-shadow hover:shadow-glow ${product.is_active ? '' : 'opacity-60'}`}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {product.thumbnail_url ? (
                    <img src={product.thumbnail_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary/50" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-medium text-primary">{product.category}</span>
                      <h3 className="truncate font-semibold">{product.title}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-8 w-8 shrink-0" aria-label={t('products.actions')}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openModal(product)}><Pencil /> {t('common.edit')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setDeleteTarget(product)} className="text-destructive focus:text-destructive"><Trash2 /> {t('common.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{formatRupiah(product.price)}</span>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.is_active ? t('products.visible') : t('products.draft')}
                      <Switch checked={product.is_active} onCheckedChange={() => toggleActive(product)} aria-label={t('common.showInStore')} />
                    </label>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create / edit */}
      <Dialog open={showModal} onOpenChange={(o) => !saving && setShowModal(o)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? t('products.edit') : t('products.new')}</DialogTitle>
            <DialogDescription>{t('products.formDesc')}</DialogDescription>
          </DialogHeader>
          <form id="product-form" onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <div className="space-y-3">
              <Dropzone
                accept="image/*"
                label={formData.thumbnail_file?.name ?? t('products.thumbnail')}
                hint={t('products.thumbHint')}
                progress={progress}
                done={progress === 100}
                className="aspect-square p-0"
                preview={
                  thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-60" />
                  ) : undefined
                }
                onFile={(file) => {
                  if (!file.type.startsWith('image/')) return toast.error(t('products.errImage'));
                  setFormData((f) => ({ ...f, thumbnail_file: file }));
                  setThumbnailPreview(URL.createObjectURL(file));
                }}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">{t('products.fieldTitle')}</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Template landing page" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="price">{t('products.fieldPrice')}</Label>
                  <Input id="price" type="number" min={0} step={1} value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="150000" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">{t('products.fieldCategory')}</Label>
                  <Input id="category" list="categories" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Web App" />
                  <datalist id="categories">
                    {Array.from(new Set(products.map((p) => p.category))).map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delivery-url">{t('products.link')}</Label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="delivery-url"
                    type="url"
                    inputMode="url"
                    value={formData.delivery_url}
                    onChange={(e) => setFormData({ ...formData, delivery_url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    aria-describedby="delivery-url-hint"
                    className="pl-10"
                  />
                </div>
                <p id="delivery-url-hint" className="text-xs text-muted-foreground">{t('products.linkHint')}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">{t('products.fieldDesc')}</Label>
                <Textarea id="description" rows={5} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('products.descPlaceholder')} />
                <p className={`text-right text-xs ${formData.description.trim().length < 10 ? 'text-muted-foreground' : 'text-success'}`}>{formData.description.trim().length} / min 10</p>
              </div>
              <label className="flex items-center justify-between rounded-xl border bg-muted/40 p-3">
                <span>
                  <span className="block text-sm font-medium">{t('common.showInStore')}</span>
                  <span className="text-xs text-muted-foreground">{t('products.draftHint')}</span>
                </span>
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              </label>
              <AnimatePresence>
                {formError && (
                  <motion.p
                    role="alert"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, 0] }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {formError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>{t('common.cancel')}</Button>
            <Button type="submit" form="product-form" variant="brand" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {saving ? t('common.saving') : editingProduct ? t('products.saveChanges') : t('products.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('products.confirmDelete', { title: deleteTarget?.title ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('products.confirmDeleteSub')}</AlertDialogDescription>
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
