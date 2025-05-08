'use client';

/**
 * Email Editor Toolbar Component
 * 
 * A specialized toolbar for the email template editor with
 * email-specific formatting controls.
 */

import { useState } from 'react';
import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link,
  Image,
  Heading2,
  Heading3,
  Columns,
  Minus,
  SlidersHorizontal,
  MousePointer,
  Palette,
  Square,
  Maximize,
  Layout,
  SpaceIcon,
  ImagePlus,
  Frame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmailEditorToolbarProps {
  editor: Editor | null;
}

export default function EmailEditorToolbar({ editor }: EmailEditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('https://');
  const [buttonText, setButtonText] = useState('Click Here');
  const [buttonUrl, setButtonUrl] = useState('https://');
  const [buttonColor, setButtonColor] = useState('#b08ba5'); // Graceful Homeschooling purple
  
  if (!editor) {
    return null;
  }
  
  // Helper to check if button should be active
  const isActive = (type: string, options = {}) => {
    return editor.isActive(type, options);
  };
  
  return (
    <div className="border-b p-2 flex flex-wrap gap-2 items-center bg-muted/20">
      <TooltipProvider delayDuration={300}>
        {/* Text Style Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('bold') ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('italic') ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('underline') ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Underline</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Heading Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Subheading</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Alignment Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('textAlign', { align: 'left' }) ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Left</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('textAlign', { align: 'center' }) ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Center</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('textAlign', { align: 'right' }) ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Right</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* List Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('bulletList') ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant={isActive('orderedList') ? 'default' : 'ghost'}
              className="h-8 w-8"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered List</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Link Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant={isActive('link') ? 'default' : 'ghost'}
              className="h-8 w-8"
            >
              <Link className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Insert Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (isActive('link')) {
                    editor.chain().focus().unsetLink().run();
                  }
                }}
                disabled={!isActive('link')}
              >
                Remove Link
              </Button>
              <Button 
                onClick={() => {
                  if (linkUrl) {
                    editor.chain().focus().setLink({ href: linkUrl }).run();
                  }
                }}
              >
                Save Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {/* Email Components Header */}
        <div className="px-2 flex items-center">
          <span className="text-xs font-medium text-muted-foreground">Email Components</span>
        </div>
        
        {/* Button Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Insert Button"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Insert Call-to-Action Button</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="button-text">Button Text</Label>
                <Input
                  id="button-text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Click Here"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="button-url">Button URL</Label>
                <Input
                  id="button-url"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="button-color">Button Color</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={buttonColor === '#b08ba5' ? 'default' : 'outline'}
                    onClick={() => setButtonColor('#b08ba5')}
                    className="rounded-full"
                    style={{ backgroundColor: '#b08ba5', width: '24px', height: '24px', padding: 0 }}
                  />
                  <Button
                    type="button"
                    variant={buttonColor === '#f1b5bc' ? 'default' : 'outline'}
                    onClick={() => setButtonColor('#f1b5bc')}
                    className="rounded-full"
                    style={{ backgroundColor: '#f1b5bc', width: '24px', height: '24px', padding: 0 }}
                  />
                  <Button
                    type="button"
                    variant={buttonColor === '#9ac5d9' ? 'default' : 'outline'}
                    onClick={() => setButtonColor('#9ac5d9')}
                    className="rounded-full"
                    style={{ backgroundColor: '#9ac5d9', width: '24px', height: '24px', padding: 0 }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  if (buttonText && buttonUrl) {
                    editor.chain().focus().setEmailButton({
                      label: buttonText,
                      href: buttonUrl,
                      color: buttonColor,
                    }).run();
                  }
                }}
              >
                Insert Button
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Columns Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setTwoColumnLayout().run()}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Two Columns</TooltipContent>
        </Tooltip>
        
        {/* Divider Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => editor.chain().focus().setEmailDivider().run()}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Divider</TooltipContent>
        </Tooltip>
        
        {/* Card/Box Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Insert Content Box"
            >
              <Square className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Insert Content Box</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().setEmailCard({
                        backgroundColor: '#f8f8f8',
                        borderColor: '#f1b5bc',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#f8f8f8', borderColor: '#f1b5bc' }}
                  >
                    Light Gray
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().setEmailCard({
                        backgroundColor: '#f9f0f2',
                        borderColor: '#f1b5bc',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#f9f0f2', borderColor: '#f1b5bc' }}
                  >
                    Light Pink
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().setEmailCard({
                        backgroundColor: '#f0f5f8',
                        borderColor: '#9ac5d9',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#f0f5f8', borderColor: '#9ac5d9' }}
                  >
                    Light Blue
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Image Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Insert Responsive Image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Insert Responsive Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="image-src">Image URL</Label>
                <Input
                  id="image-src"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-alt">Alt Text</Label>
                <Input
                  id="image-alt"
                  placeholder="Description of image"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-align">Alignment</Label>
                <RadioGroup defaultValue="center" id="image-align">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="align-left" />
                    <Label htmlFor="align-left">Left</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="align-center" />
                    <Label htmlFor="align-center">Center</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="align-right" />
                    <Label htmlFor="align-right">Right</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  const src = (document.getElementById('image-src') as HTMLInputElement)?.value;
                  const alt = (document.getElementById('image-alt') as HTMLInputElement)?.value;
                  const alignInputs = document.querySelectorAll('input[name="image-align"]');
                  let align = 'center';
                  
                  alignInputs.forEach((input: Element) => {
                    if ((input as HTMLInputElement).checked) {
                      align = (input as HTMLInputElement).value;
                    }
                  });
                  
                  if (src) {
                    editor.chain().focus().setEmailImage({
                      src,
                      alt: alt || '',
                      align: align as 'left' | 'center' | 'right',
                    }).run();
                  }
                }}
              >
                Insert Image
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Spacing Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Add Spacing"
            >
              <SpaceIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Vertical Spacing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Spacing Size</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().setEmailSpacing({ height: '10px' }).run();
                    }}
                    className="flex-1"
                  >
                    Small (10px)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().setEmailSpacing({ height: '20px' }).run();
                    }}
                    className="flex-1"
                  >
                    Medium (20px)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().setEmailSpacing({ height: '40px' }).run();
                    }}
                    className="flex-1"
                  >
                    Large (40px)
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Header Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Add Email Header"
            >
              <Layout className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Email Header</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="header-title">Header Title</Label>
                <Input
                  id="header-title"
                  defaultValue="Graceful Homeschooling"
                  placeholder="Graceful Homeschooling"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="header-logo">Logo URL (optional)</Label>
                <Input
                  id="header-logo"
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label>Header Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const title = (document.getElementById('header-title') as HTMLInputElement)?.value || 'Graceful Homeschooling';
                      const logoUrl = (document.getElementById('header-logo') as HTMLInputElement)?.value || '';
                      
                      editor.chain().focus().setEmailHeader({
                        title,
                        logoUrl,
                        backgroundColor: '#f1b5bc',
                        textColor: 'white',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#f1b5bc', color: 'white' }}
                  >
                    Pink
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const title = (document.getElementById('header-title') as HTMLInputElement)?.value || 'Graceful Homeschooling';
                      const logoUrl = (document.getElementById('header-logo') as HTMLInputElement)?.value || '';
                      
                      editor.chain().focus().setEmailHeader({
                        title,
                        logoUrl,
                        backgroundColor: '#b08ba5',
                        textColor: 'white',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#b08ba5', color: 'white' }}
                  >
                    Purple
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const title = (document.getElementById('header-title') as HTMLInputElement)?.value || 'Graceful Homeschooling';
                      const logoUrl = (document.getElementById('header-logo') as HTMLInputElement)?.value || '';
                      
                      editor.chain().focus().setEmailHeader({
                        title,
                        logoUrl,
                        backgroundColor: '#9ac5d9',
                        textColor: 'white',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#9ac5d9', color: 'white' }}
                  >
                    Blue
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const title = (document.getElementById('header-title') as HTMLInputElement)?.value || 'Graceful Homeschooling';
                      const logoUrl = (document.getElementById('header-logo') as HTMLInputElement)?.value || '';
                      
                      editor.chain().focus().setEmailHeader({
                        title,
                        logoUrl,
                        backgroundColor: '#ffffff',
                        textColor: '#333333',
                      }).run();
                    }}
                    className="flex-1"
                    style={{ backgroundColor: '#ffffff', color: '#333333', border: '1px solid #e2e8f0' }}
                  >
                    White
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Footer Control */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="Add Email Footer"
            >
              <Frame className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Email Footer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="footer-company">Company Name</Label>
                <Input
                  id="footer-company"
                  defaultValue="Graceful Homeschooling"
                  placeholder="Graceful Homeschooling"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer-text">Additional Text</Label>
                <Input
                  id="footer-text"
                  defaultValue="For security reasons, please do not reply to this email."
                  placeholder="For security reasons, please do not reply to this email."
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-unsubscribe"
                  className="form-checkbox h-4 w-4"
                  defaultChecked
                />
                <Label htmlFor="include-unsubscribe">Include unsubscribe links</Label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  const companyName = (document.getElementById('footer-company') as HTMLInputElement)?.value || 'Graceful Homeschooling';
                  const additionalText = (document.getElementById('footer-text') as HTMLInputElement)?.value || 'For security reasons, please do not reply to this email.';
                  const includeUnsubscribe = (document.getElementById('include-unsubscribe') as HTMLInputElement)?.checked;
                  
                  editor.chain().focus().setEmailFooter({
                    companyName,
                    additionalText,
                    includeUnsubscribe,
                    year: new Date().getFullYear().toString(),
                    backgroundColor: '#f8f8f8',
                    textColor: '#666666',
                  }).run();
                }}
              >
                Insert Footer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
}
