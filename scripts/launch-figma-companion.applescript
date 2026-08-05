on run
  tell application "System Events"
    if not (exists process "Figma") then error "Figma Desktop is not running."
    if UI elements enabled is false then error "Accessibility permission is required for automatic Layntra launch."
  end tell

  tell application "Figma" to activate
  delay 0.35

  tell application "System Events" to tell process "Figma"
    click menu bar item "Plugins" of menu bar 1
    delay 0.25
    click menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
    delay 0.35

    set developmentMenu to menu 1 of menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
    if not (exists menu item "Layntra for Figma" of developmentMenu) then
      key code 53
      error "Layntra for Figma is not imported as a development plugin."
    end if

    click menu item "Layntra for Figma" of developmentMenu
  end tell

  return "Requested Layntra for Figma from the local Development menu."
end run
