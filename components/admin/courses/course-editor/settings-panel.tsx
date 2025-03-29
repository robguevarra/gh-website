import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    title: "",
    description: "",
    price: "",
    isPublic: false,
    requiresEnrollment: true,
    allowComments: true,
    showProgress: true,
  })

  const handleSave = () => {
    // TODO: Implement settings save
    console.log("Saving settings:", settings)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Course Title</Label>
        <Input
          id="title"
          value={settings.title}
          onChange={(e) => setSettings({ ...settings, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Course Description</Label>
        <Textarea
          id="description"
          value={settings.description}
          onChange={(e) =>
            setSettings({ ...settings, description: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <Input
          id="price"
          type="number"
          value={settings.price}
          onChange={(e) => setSettings({ ...settings, price: e.target.value })}
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Public Course</Label>
            <p className="text-sm text-muted-foreground">
              Make this course visible to everyone
            </p>
          </div>
          <Switch
            checked={settings.isPublic}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, isPublic: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Require Enrollment</Label>
            <p className="text-sm text-muted-foreground">
              Students must enroll before accessing content
            </p>
          </div>
          <Switch
            checked={settings.requiresEnrollment}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, requiresEnrollment: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Allow Comments</Label>
            <p className="text-sm text-muted-foreground">
              Enable comments on lessons
            </p>
          </div>
          <Switch
            checked={settings.allowComments}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, allowComments: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show Progress</Label>
            <p className="text-sm text-muted-foreground">
              Display progress tracking for students
            </p>
          </div>
          <Switch
            checked={settings.showProgress}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, showProgress: checked })
            }
          />
        </div>
      </div>
      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </div>
  )
} 