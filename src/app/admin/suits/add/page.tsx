"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/admin/ui/PageHeader";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import SuitForm from "@/components/admin/suits/SuitForm";
import { useCurrentAdmin } from "@/lib/admin/useCurrentAdmin";
import { suitsApi, type SuitCategory } from "@/lib/api/suitsApi";

export default function AddSuitPage() {
  const router = useRouter();
  const { user, loaded } = useCurrentAdmin();
  const [categories, setCategories] = useState<SuitCategory[]>([]);
  useEffect(() => { suitsApi.categories().then(setCategories).catch(() => setCategories([])); }, []);

  if (!loaded) return null;
  return (
    <section>
      <PageHeader title="Add unstitched suit" subtitle="Create the suit as a draft first; add images, then publish when it is ready." actions={<CommonButton role="link" to="/admin/suits" className="admin_outline_btn">Back to suits</CommonButton>} />
      <SuitForm
        categories={categories}
        canSetStock={Boolean(user?.permissions.stock)}
        submitLabel="Create Suit"
        onSubmit={async (body) => {
          const suit = await suitsApi.create(body);
          router.push(`/admin/suits/${suit.id}/edit?created=1`);
        }}
      />
    </section>
  );
}
