import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import i18n from "../../i18n";
import languages from "../../common/languages";
import { useCurrency } from "../../contexts/CurrencyContext";

const LanguageDropdown = () => {
    const [selectedLang, setSelectedLang] = useState<string>("");
    const [isOpen, setIsOpen] = useState(false);
    const { setCurrency } = useCurrency();

    useEffect(() => {
        const currentLanguage = localStorage.getItem("I18N_LANGUAGE") || "sp";
        setSelectedLang(currentLanguage);
    }, []);

    const changeLanguageAction = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("I18N_LANGUAGE", lang);
        localStorage.setItem("I18N_V2", "1");
        setSelectedLang(lang);

        // Auto-switch currency based on language
        const langConfig = (languages as any)[lang];
        if (langConfig?.currency) {
            setCurrency(langConfig.currency as "COP" | "USD");
        }
    };

    return (
        <Dropdown isOpen={isOpen} toggle={() => setIsOpen(!isOpen)} className="ms-1 topbar-head-dropdown header-item">
            <DropdownToggle className="btn btn-topbar btn-ghost-secondary rounded-pill shadow-none d-flex align-items-center gap-1 px-2" tag="button">
                <img src={languages[selectedLang]?.flag} alt="Lang" height="18" className="rounded" />
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end py-2" style={{ minWidth: '200px' }}>
                <h6 className="dropdown-header">{selectedLang === 'en' ? 'Language' : 'Idioma'}</h6>
                {Object.keys(languages).map(key => (
                    <DropdownItem
                        key={key}
                        onClick={() => changeLanguageAction(key)}
                        className={selectedLang === key ? "active" : ""}
                    >
                        <img src={languages[key].flag} alt="" className="me-2 rounded" height="16" />
                        <span className="align-middle">{languages[key].label}</span>
                    </DropdownItem>
                ))}
            </DropdownMenu>
        </Dropdown>
    );
};

export default LanguageDropdown;
