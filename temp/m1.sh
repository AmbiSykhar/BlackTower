echo "Processor: $(sysctl -n machdep.cpu.brand_string)"
ioreg -l | grep IOPlatformSerialNumber | awk '{gsub(/"/, "", $NF); print "Serial Number:", $NF}'
echo "Memory Size: $(expr $(sysctl -n hw.memsize) / $((1024**3))) GB"
df / | sed '1d' | awk '/^\/dev\/disk[0-9]s[0-9]s[0-9]/ {printf "Storage Size: %.0f GB\n", $2 * 512 / 1000000000}'
system_profiler SPHardwareDataType | grep "Model Number" | xargs
echo "Battery Health: $(expr $((100 * $(ioreg -l | grep '"AppleRawMaxCapacity" = ' | awk '{print $NF}') / $(ioreg -l | grep '"DesignCapacity" = ' | awk '{print $NF}'))))%"
read -p "Press Return to open testing sites"
open https://t.techdefenders.com https://webcammictest.com/check-mic.html