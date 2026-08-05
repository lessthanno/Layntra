on run argv
  if (count of argv) is not 1 then error "Expected the absolute path to the Layntra manifest."
  set manifestPath to item 1 of argv

  tell application "System Events"
    if not (exists disk item manifestPath) then error "Layntra manifest was not found: " & manifestPath
    if UI elements enabled is false then error "Accessibility permission is required to import Layntra for Figma automatically."
  end tell

  tell application "Figma" to activate
  delay 0.5

  tell application "System Events" to tell process "Figma"
    click menu bar item "Plugins" of menu bar 1
    delay 0.25
    click menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
    delay 0.25
    click menu item "Import plugin from manifest…" of menu 1 of menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
  end tell

  delay 0.6
  tell application "System Events"
    key code 5 using {command down, shift down}
    delay 0.35
    keystroke manifestPath
    delay 0.2
    key code 36
    delay 0.6
    key code 36
  end tell

  tell application "System Events" to tell process "Figma"
    repeat with attempt from 1 to 25
      if (count of sheets of window 1) is 0 then exit repeat
      delay 0.2
    end repeat
    if (count of sheets of window 1) is not 0 then error "Figma did not finish importing the Layntra manifest."

    click menu bar item "Plugins" of menu bar 1
    delay 0.2
    click menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
    delay 0.2
    set developmentMenu to menu 1 of menu item "Development" of menu 1 of menu bar item "Plugins" of menu bar 1
    if not (exists menu item "Layntra for Figma" of developmentMenu) then
      key code 53
      error "Figma did not register Layntra for Figma in the local Development menu."
    end if
    key code 53
  end tell

  return "Imported Layntra for Figma from the local manifest."
end run
