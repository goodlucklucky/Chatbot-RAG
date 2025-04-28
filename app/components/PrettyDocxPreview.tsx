"use client";
import { DocumentEditorContainerComponent, Toolbar, WordExport, SfdtExport, Selection, Editor, DocumentEditorKeyDownEventArgs, CustomToolbarItemModel } from '@syncfusion/ej2-react-documenteditor';
import { useEffect, RefObject } from "react";

//Inject require module.
DocumentEditorContainerComponent.Inject(Toolbar, SfdtExport, Selection, Editor, WordExport);
export default function DocxPreview({
  containerRef,
  setSelectionFlag,
  fetchAndRenderDocx
}: {
  containerRef: RefObject<DocumentEditorContainerComponent | null>;
  setSelectionFlag: () => void;
  fetchAndRenderDocx: () => void;
}) {
  const saveItem: CustomToolbarItemModel = {
    prefixIcon: 'e-save icon',
    tooltipText: 'Save the Document',
    text: 'Save',
    id: 'save',
  };
  const downloadItem: CustomToolbarItemModel = {
    prefixIcon: 'e-download icon',
    tooltipText: 'Download the Document',
    text: 'Download',
    id: 'download',
  };
  const items = [
    'New',
    'Open',
    saveItem,
    downloadItem,
    'Separator',
    'Undo',
    'Redo',
    'Separator',
    'Image',
    'Table',
    'Hyperlink',
    'Bookmark',
    'TableOfContents',
    'Separator',
    'Header',
    'Footer',
    'PageSetup',
    'PageNumber',
    'Break',
    'InsertFootnote',
    'InsertEndnote',
    'Separator',
    'Find',
    'Separator',
    'Comments',
    'TrackChanges',
    'Separator',
    'LocalClipboard',
    'RestrictEditing',
    'Separator',
    'FormFields',
    'UpdateFields',
    'ContentControl',
  ];

  type ToolbarClickArgs = {
    item: {
      id: string;
    };
  };

  async function onToolbarClick(args: ToolbarClickArgs) {
    if (args.item.id == 'save') {
      const blob = await containerRef.current?.documentEditor.saveAsBlob("Docx");
      if (blob) {
        const formData = new FormData();
        formData.append('file', blob, 'document.docx');
        formData.append('user_id', localStorage.getItem("userName") ?? '');

        const url = process.env.NEXT_PUBLIC_BACKEND_URL ? process.env.NEXT_PUBLIC_BACKEND_URL : "https://chatbot-rag-1-ugmp.onrender.com"
        await fetch(`${url}/api/save`, {
          method: 'POST',
          body: formData,
        })
      }
    } else if (args.item.id == 'download') {
      const fileName: string = localStorage.getItem("userName") ?? "sample";
      containerRef.current?.documentEditor.save(fileName, 'Docx');
    }
  }

  useEffect(() => {
    window.addEventListener('resize', updateDocumentEditorSize);
    containerRef.current?.resize(parseInt(containerRef.current?.width), window.innerHeight);
  }, [containerRef, updateDocumentEditorSize])

  useEffect(() => {
    fetchAndRenderDocx();
  }, []);

  // Ctrl+Shift+L keydown event
  useEffect(() => {
    const handleHotkey = (event: KeyboardEvent) => {
      // Check for Ctrl + Shift + L
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setSelectionFlag();
      }

    };

    document.addEventListener('keydown', handleHotkey);
    if (containerRef.current?.documentEditor) {
      containerRef.current.documentEditor.keyDown = function (args: DocumentEditorKeyDownEventArgs) {
        const keyCode: number = args.event.which || args.event.keyCode;
        const isCtrlKey: boolean = (args.event.ctrlKey || args.event.metaKey) ? true : keyCode === 17;
        const isShiftKey: boolean = args.event.shiftKey ? args.event.shiftKey : keyCode === 16;
        //67 is the character code for 'C' 
        if (isCtrlKey && isShiftKey && keyCode === 76) {
          //To prevent copy operation set isHandled to true 
          args.isHandled = true;
          args.event.preventDefault();
          setSelectionFlag();
        }
      }
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleHotkey);
    };
  }, [containerRef, setSelectionFlag]);

  function updateDocumentEditorSize() {
    //Resizes the document editor component to fit browser window.
    containerRef.current?.resize(parseInt(containerRef.current?.width), window.innerHeight);
  }

  return (
    <div>
      <DocumentEditorContainerComponent
        id="container"
        className="min-h-screen"
        height="700px"
        ref={containerRef}
        enableSpellCheck={true}
        serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/documenteditor/"
        // @ts-expect-error Ignore this error
        toolbarItems={items}
        toolbarClick={onToolbarClick}
        enableToolbar={true} />
    </div>
  );
}