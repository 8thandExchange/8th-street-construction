import { PROJECT_CATEGORY_LABELS } from "@/lib/utils";

interface ProjectFormFieldsProps {
  defaults?: {
    slug?: string;
    title?: string;
    subtitle?: string;
    category?: string;
    status?: string;
    excerpt?: string;
    narrative?: string;
    hero_image_url?: string;
    location?: string;
    year_completed?: number;
    square_footage?: number;
    budget_range?: string;
    meta_description?: string;
    display_order?: number;
    featured?: boolean;
  };
}

export function ProjectFormFields({ defaults = {} }: ProjectFormFieldsProps) {
  return (
    <div className="flex flex-col gap-7">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <label className="field-label">Title *</label>
          <input
            name="title"
            required
            defaultValue={defaults.title ?? ""}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Slug (URL) *</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9-]+"
            defaultValue={defaults.slug ?? ""}
            className="field-input"
            placeholder="riverside-residence"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Subtitle</label>
        <input
          name="subtitle"
          defaultValue={defaults.subtitle ?? ""}
          className="field-input"
          placeholder="A short one-line description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="field-label">Category *</label>
          <select
            name="category"
            required
            defaultValue={defaults.category ?? ""}
            className="field-input"
          >
            <option value="" disabled>Select…</option>
            {Object.entries(PROJECT_CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Status *</label>
          <select
            name="status"
            required
            defaultValue={defaults.status ?? "draft"}
            className="field-input"
          >
            <option value="draft">Draft (hidden from public)</option>
            <option value="pre_construction">Pre-Construction</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Excerpt</label>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={defaults.excerpt ?? ""}
          className="field-input py-3 resize-none"
          placeholder="Card teaser (~140 chars)"
          maxLength={280}
        />
      </div>

      <div>
        <label className="field-label">Project Narrative</label>
        <textarea
          name="narrative"
          rows={10}
          defaultValue={defaults.narrative ?? ""}
          className="field-input py-3 resize-none"
          placeholder="The full story — challenge, approach, outcome. Plain text; line breaks preserved."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="field-label">Location</label>
          <input
            name="location"
            defaultValue={defaults.location ?? ""}
            className="field-input"
            placeholder="Augusta, GA"
          />
        </div>
        <div>
          <label className="field-label">Year Completed</label>
          <input
            type="number"
            name="year_completed"
            defaultValue={defaults.year_completed ?? ""}
            className="field-input"
            min="1900"
            max="2100"
          />
        </div>
        <div>
          <label className="field-label">Square Footage</label>
          <input
            type="number"
            name="square_footage"
            defaultValue={defaults.square_footage ?? ""}
            className="field-input"
            min="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="field-label">Budget Range (display)</label>
          <input
            name="budget_range"
            defaultValue={defaults.budget_range ?? ""}
            className="field-input"
            placeholder="$500K – $750K"
          />
        </div>
        <div>
          <label className="field-label">Display Order</label>
          <input
            type="number"
            name="display_order"
            defaultValue={defaults.display_order ?? 0}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <label className="field-label">Hero Image URL</label>
        <input
          name="hero_image_url"
          defaultValue={defaults.hero_image_url ?? ""}
          className="field-input"
          placeholder="https://...supabase.co/storage/v1/object/public/project-images/..."
        />
        <p className="mt-2 text-xs text-stone-300 font-mono">
          Upload to the <code>project-images</code> bucket in Supabase and paste the public URL.
        </p>
      </div>

      <div>
        <label className="field-label">Meta Description (SEO)</label>
        <textarea
          name="meta_description"
          rows={2}
          defaultValue={defaults.meta_description ?? ""}
          className="field-input py-3 resize-none"
          maxLength={180}
          placeholder="Up to 180 chars — shows in Google results"
        />
      </div>

      <div className="border-t border-ink/15 pt-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={defaults.featured ?? false}
            className="w-5 h-5 accent-copper"
          />
          <span className="text-sm text-ink">Feature on homepage</span>
        </label>
      </div>
    </div>
  );
}
