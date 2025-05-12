// app/admin/tag-management/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TagTypeList from "@/components/tag-management/tag-type-list";
import TagList from "@/components/tag-management/tag-list";

export default function TagManagementPage() {
  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Tag Management
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Organize and manage your tagging system, including tag types and hierarchical tags.
        </p>
      </header>

      <Tabs defaultValue="tag-types" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:max-w-md mb-6">
          <TabsTrigger value="tag-types">Tag Types</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="tag-types">
          <TagTypeList />
        </TabsContent>

        <TabsContent value="tags">
          <TagList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
