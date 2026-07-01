const fs = require('fs');
const path = require('path');

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = findFiles(path.join(__dirname, 'src'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace Footer imports
  if (content.includes('import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";')) {
    content = content.replace('import BoutiqueFooter from "@/components/boutique/Footer/BoutiqueFooter";', 'import Footer from "@/common/footer/Footer";');
    changed = true;
  }
  
  if (content.includes('<BoutiqueFooter')) {
    content = content.replace(/<BoutiqueFooter/g, '<Footer');
    changed = true;
  }
  
  if (content.includes('</BoutiqueFooter>')) {
    content = content.replace(/<\/BoutiqueFooter>/g, '</Footer>');
    changed = true;
  }

  // Replace Header imports
  if (content.includes('import Header from "@/components/boutique/Header/Header";')) {
    content = content.replace('import Header from "@/components/boutique/Header/Header";', 'import Header from "@/common/header/Header";');
    changed = true;
  }
  
  // Also some files might import BoutiqueNavbar as Header
  if (content.includes('import BoutiqueNavbar from "@/components/boutique/Header/Header";')) {
    content = content.replace('import BoutiqueNavbar from "@/components/boutique/Header/Header";', 'import Header from "@/common/header/Header";');
    changed = true;
    content = content.replace(/<BoutiqueNavbar/g, '<Header');
    content = content.replace(/<\/BoutiqueNavbar>/g, '</Header>');
  }

  // Replace BoutiqueNavbar imports
  if (content.includes('import BoutiqueNavbar from "@/components/boutique/Navbar/BoutiqueNavbar";')) {
    content = content.replace('import BoutiqueNavbar from "@/components/boutique/Navbar/BoutiqueNavbar";', 'import Header from "@/common/header/Header";');
    changed = true;
    content = content.replace(/<BoutiqueNavbar/g, '<Header');
    content = content.replace(/<\/BoutiqueNavbar>/g, '</Header>');
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
